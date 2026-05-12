import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import { useCart } from "../context/CartContext";
import { createBooking, createTransaction } from "../firebase/bookingService";
import { auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { waitForFirebaseUser } from "../utils/waitForFirebaseUser";
import { validatePromoCode } from "../firebase/promoService";
import { getCurrentUserId } from "../utils/authSession";
import { getStoredProfile } from "../utils/profileData";
import { toast } from "sonner";
import api from "../api/axios";
import { bookSlot } from "../firebase/slotService";
import clinicImage from "../assets/images/laser-clinic-image.jpg";

const loadScript = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartItems,
    getCartSubtotal,
    getCartTotal,
    getCartCount,
    clearCart,
    promoDetails,
    applyPromo,
    removePromo,
    getDiscountAmount,
  } = useCart();

  const [couponText, setCouponText] = useState(promoDetails?.code || "");
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToBookings, setRedirectingToBookings] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);
  const bookingFromState = location.state?.bookingDetails;
  const bookingFromStorage = localStorage.getItem("bookingDetails");
  let selectedDate = "";
  let selectedTime = "";
  let dateISO = null;

  if (bookingFromState) {
    selectedDate =
      bookingFromState?.date ||
      (bookingFromState?.dateISO
        ? new Date(bookingFromState.dateISO).toDateString()
        : "");
    selectedTime = bookingFromState?.time || "";
    dateISO = bookingFromState?.dateISO;
  } else if (bookingFromStorage) {
    try {
      const parsed = JSON.parse(bookingFromStorage);
      selectedDate =
        parsed?.date ||
        (parsed?.dateISO ? new Date(parsed.dateISO).toDateString() : "");
      selectedTime = parsed?.time || "";
      dateISO = parsed?.dateISO;
    } catch (error) {}
  }

  let addressLabel = "";
  const fullAddress = localStorage.getItem("fullAddress");
  if (fullAddress) {
    try {
      const parsedAddress = JSON.parse(fullAddress);
      addressLabel =
        parsedAddress?.fullAddress ||
        [
          parsedAddress?.house,
          parsedAddress?.building,
          parsedAddress?.landmark,
          parsedAddress?.selectedAddress,
        ]
          .filter(Boolean)
          .join(", ");
    } catch (error) {}
  }

  const subtotal = getCartSubtotal();
  const estimatedTaxes = 0;
  const discount = getDiscountAmount();
  const total = subtotal + estimatedTaxes - discount;

  useEffect(() => {
    const hasBooking = sessionStorage.getItem("bookingCompleted");

    if (hasBooking) {
      navigate("/my-booking", { replace: true });
    }
  }, []);

  const redirectToBookingsWithLoader = () => {
    setRedirectingToBookings(true);
    window.setTimeout(() => {
      navigate("/my-booking", { replace: true });
    }, 1800);
  };

  const handleApplyCoupon = async () => {
    if (!couponText.trim()) return;
    setPromoLoading(true);
    setPromoMessage("");

    try {
      const result = await validatePromoCode(couponText.trim());
      if (result.valid) {
        if (result.minOrder && subtotal < result.minOrder) {
          setPromoMessage(`Minimum order of ₹${result.minOrder} required`);
          removePromo();
        } else {
          applyPromo(result);
          setPromoMessage(result.message);
        }
      } else {
        setPromoMessage(result.message);
        removePromo();
      }
    } catch {
      setPromoMessage("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (cartItems.length === 0) return;

    if (!selectedTime || !selectedDate) {
      toast.error("Please select a date and time slot first.");
      return;
    }

    if (!addressLabel) {
      toast.error("Please select a delivery address first.");
      return;
    }

    setSubmitting(true);

    // 1. Create start FIRST
    const start = new Date(dateISO);

    // convert time
    const [time, modifier] = selectedTime.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    start.setHours(hours, minutes || 0, 0, 0);
    console.log("CART ITEMS:", cartItems);
    const totalDuration = cartItems.reduce((sum, item) => {
      return sum + (item.durationMinutes || 0) * (item.quantity || 1);
    }, 0);
    console.log(
      "DURATION LIST:",
      cartItems.map((i) => i.durationMinutes),
    );
    console.log("TOTAL DURATION:", totalDuration);

    // 3. Create end
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + totalDuration);

    // 4. THEN create dateKey ✅
    const dateKey = start.toISOString().split("T")[0];
    const profile = getStoredProfile();
    if (paymentMethod === "cod") {
      try {
        if (!authReady) {
          toast.error("Please wait, loading user...");
          setSubmitting(false);
          return;
        }

        if (!firebaseUser) {
          toast.error("Please login to continue");
          navigate("/sign-in");
          setSubmitting(false);
          return;
        }

        const bookingRef = await createBooking({
          userId: firebaseUser.uid,
          services: cartItems.map((item) => ({
            id: item.id,
            name: item.name || item.description,
            price: item.price,
            quantity: item.quantity,
            category: item.category,
          })),
          date: selectedDate,
          dateISO: dateISO,
          dateKey: dateKey,
          time: selectedTime,
          startTime: start.toISOString(), // ✅ ADD THIS
          endTime: end.toISOString(), // ✅ ADD THIS
          timeSlot: selectedTime,
          address: addressLabel,
          subtotal,
          tax: estimatedTaxes,
          discount,
          total,
          coupon: promoDetails?.code || null,
          paymentMethod: "cod",
          paymentStatus: "pending",
          paymentId: null,
          transactionId: null,
        });

        await bookSlot(dateKey, {
          bookingId: bookingRef,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });

        clearCart();
        sessionStorage.setItem("bookingCompleted", "true");
        localStorage.removeItem("bookingDetails");
        removePromo();

        toast.success("Booking created with Cash on Delivery.");
        api
          .post("/booking/send-booking-email", {
            email: profile?.email,
            name: profile?.fullName,
            booking: {
              date: selectedDate,
              time: selectedTime,
              address: addressLabel,
              total,
              paymentMethod: "Cash on Delivery",
              services: cartItems,
            },
          })
          .catch((err) => console.error("Email failed:", err));
        redirectToBookingsWithLoader();
      } catch (error) {
        if (error.message.includes("overlap")) {
          toast.error(
            "This time slot was just booked. Please choose another slot.",
          );
        } else {
          toast.error("Failed to create booking.");
        }
      } finally {
        setSubmitting(false);
      }

      return;
    }

    try {
      const res = await loadScript(
        "https://checkout.razorpay.com/v1/checkout.js",
      );

      if (!res) {
        toast.error("Razorpay SDK failed to load. Check your connection.");
        setSubmitting(false);
        return;
      }

      const profile = getStoredProfile();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round(total * 100),
        currency: "INR",
        name: "Flaw Skin Laser Clinic",
        description: "Booking Payment",
        handler: async function (response) {
          try {
            // ✅ CAPTURE PAYMENT FIRST
            await api.post("/payment/capture", {
              paymentId: response.razorpay_payment_id,
              amount: Math.round(total * 100),
            });

            const currentUser =
              auth.currentUser || (await waitForFirebaseUser());

            if (!currentUser) {
              throw new Error("Session expired. Please login again.");
            }

            const transactionId = await createTransaction({
              paymentId: response.razorpay_payment_id,
              userId: currentUser.uid,
              total,
              subtotal,
              tax: estimatedTaxes,
              discount,
              coupon: promoDetails?.code || null,
              paymentMethod: "online",
            });

            const bookingRef = await createBooking({
              userId: currentUser.uid,
              services: cartItems.map((item) => ({
                id: item.id,
                name: item.name || item.description,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
              })),
              date: selectedDate,
              dateISO: dateISO,
              dateKey: dateKey,
              time: selectedTime,
              startTime: start.toISOString(), // ✅ ADD THIS
              endTime: end.toISOString(), // ✅ ADD THIS
              timeSlot: selectedTime,
              address: addressLabel,
              subtotal,
              tax: estimatedTaxes,
              discount,
              total,
              coupon: promoDetails?.code || null,
              paymentMethod: "online",
              paymentStatus: "paid",
              paymentId: response.razorpay_payment_id,
              transactionId: transactionId,
            });

            await bookSlot(dateKey, {
              bookingId: bookingRef,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            });

            // ✅ clear everything first
            clearCart();
            removePromo();
            sessionStorage.setItem("bookingCompleted", "true");
            localStorage.removeItem("bookingDetails");

            // ✅ then UI
            setSubmitting(false);
            toast.success("Booking created successfully!");
            api
              .post("/booking/send-booking-email", {
                email: profile?.email,
                name: profile?.fullName,
                booking: {
                  date: selectedDate,
                  time: selectedTime,
                  address: addressLabel,
                  total,
                  paymentMethod: "Online",
                  services: cartItems,
                },
              })
              .catch((err) => console.error("Email failed:", err));
            redirectToBookingsWithLoader();
          } catch (error) {
            console.error("BOOKING FLOW ERROR:", error);

            setSubmitting(false);

            toast.error(error?.message || "Booking failed after payment.");
          }
        },

        prefill: {
          name: profile?.fullName || "User",
          email: profile?.email || "",
          contact: profile?.phone || "",
        },
        theme: {
          color: "#8dcae4",
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      toast.error("Failed to initiate payment.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#f1f3f5] pt-[20px] text-[#172232]">
        {submitting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md">
            <div className="flex flex-col items-center rounded-3xl bg-white px-8 py-8 shadow-2xl">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#d9edf8] border-t-[#8dcae4]" />
              <p className="mt-5 text-lg font-bold text-[#1a2538]">
                Processing Payment
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while we confirm your booking...
              </p>
            </div>
          </div>
        )}
        {redirectingToBookings ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/85 backdrop-blur-sm">
            <div className="flex flex-col items-center rounded-3xl bg-white px-8 py-10 shadow-xl">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d9edf8] border-t-[#8dbfda]" />
              <p className="mt-5 text-lg font-bold text-[#1a2538]">
                Booking confirmed
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Redirecting to My Bookings...
              </p>
            </div>
          </div>
        ) : null}
        <main className="mx-auto max-w-[1180px] px-4 pb-14 sm:px-6">
          <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-[#7f8898]">
            <Link to="/" className="hover:text-[#1a2538] hover:underline">
              Home
            </Link>
            <span>/</span>
            <Link to="/cart" className="hover:text-[#1a2538] hover:underline">
              Cart
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#1a2538]">Checkout</span>
          </p>
          <h1 className="mt-2 text-[2.2rem] font-bold text-[#1a2538]">
            Checkout
          </h1>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-6">
              <article className="rounded-2xl border border-[#e1e6ee] bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-[1.2rem] font-bold text-[#1d2940]">
                  Your Services
                </h2>

                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                    <p>No services in cart.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-xl border border-[#e8edf3] bg-[#fbfcfe] p-4"
                      >
                        <img
                          src={item.image || clinicImage}
                          alt={item.name}
                          className="h-20 w-24 rounded-lg object-cover shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8dbfda]">
                            {item.category || "Laser Treatment"}
                          </p>
                          <h3 className="text-[1rem] font-bold text-[#1b2740] truncate">
                            {item.description || item.name}
                          </h3>
                          <p className="text-[0.75rem] text-gray-400 mt-1">
                            Qty: {item.quantity} × {formatMoney(item.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[1.05rem] font-bold text-[#233047]">
                            {formatMoney(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <article className="rounded-2xl border border-[#e1e6ee] bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[1.1rem] font-bold text-[#1d2940]">
                      Home Visit
                    </h2>
                    <button
                      onClick={() =>
                        navigate("/select-slots", {
                          state: {
                            source: "checkout",
                            cartItems,
                          },
                        })
                      }
                      className="text-[0.8rem] font-bold text-[#8dbfda] hover:underline"
                    >
                      EDIT
                    </button>
                  </div>
                  <div className="space-y-3 p-4 rounded-xl bg-[#f0f9ff] border border-[#8dcae4]/20">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm text-[#8dbfda]">
                        <CalendarDays size={18} />
                      </div>
                      <span className="text-[0.95rem] font-semibold text-[#2a3c59]">
                        {selectedDate || "Not selected"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm text-[#8dbfda]">
                        <Clock3 size={18} />
                      </div>
                      <span className="text-[0.95rem] font-semibold text-[#2a3c59]">
                        {selectedTime || "Not selected"}
                      </span>
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-[#e1e6ee] bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[1.1rem] font-bold text-[#1d2940]">
                      Address
                    </h2>
                    <button
                      onClick={() => navigate("/select-address")}
                      className="text-[0.8rem] font-bold text-[#8dbfda] hover:underline"
                    >
                      EDIT
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-[#f0f9ff] border border-[#8dcae4]/20 min-h-[100px]">
                    <p className="text-[0.9rem] leading-relaxed text-[#2a3c59] font-medium">
                      {addressLabel || "Please select a delivery address"}
                    </p>
                  </div>
                </article>
              </div>
            </section>

            <aside className="sticky top-6 h-fit space-y-6">
              <div className="rounded-2xl border border-[#e1e6ee] bg-white p-6 shadow-sm">
                <h2 className="text-[1.2rem] font-bold text-[#1d2940] mb-5">
                  Order Summary
                </h2>

                <div className="space-y-4 text-[0.95rem] text-[#5e6d84] border-b border-gray-100 pb-5">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#1f2a3f]">
                      {formatMoney(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span className="font-bold text-[#1f2a3f]">
                      {formatMoney(estimatedTaxes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consultation</span>
                    <span className="font-bold text-green-500 uppercase text-[0.8rem]">
                      Free
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 font-bold bg-green-50 p-2 rounded-lg">
                      <span>Discount</span>
                      <span>-{formatMoney(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="py-5">
                  <label className="text-[0.7rem] font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                    PROMO CODE
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponText}
                      onChange={(e) => setCouponText(e.target.value)}
                      placeholder="Enter code"
                      className="h-10 flex-1 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#8dbfda]"
                      disabled={!!promoDetails}
                    />
                    {!promoDetails ? (
                      <button
                        onClick={handleApplyCoupon}
                        disabled={promoLoading}
                        className="rounded-xl bg-gray-50 px-4 text-xs font-bold text-[#1a2538] border border-gray-200 hover:bg-gray-100 transition"
                      >
                        {promoLoading ? "..." : "Apply"}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          removePromo();
                          setCouponText("");
                        }}
                        className="rounded-xl bg-red-50 px-4 text-xs font-bold text-red-500 border border-red-100 hover:bg-red-100 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {promoMessage && (
                    <p
                      className={`mt-2 text-xs ${promoDetails ? "text-green-600" : "text-red-500"} font-medium`}
                    >
                      {promoMessage}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[1.1rem] font-bold text-[#1a2538]">
                      Total Payable
                    </span>
                    <strong className="text-[2rem] tracking-tight text-[#8dbfda]">
                      {formatMoney(total)}
                    </strong>
                  </div>

                  <div className="mb-5">
                    <label className="mb-3 block text-[0.7rem] font-bold uppercase tracking-wider text-gray-400">
                      Payment Method
                    </label>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("online")}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          paymentMethod === "online"
                            ? "border-[#8dbfda] bg-[#f0f9ff]"
                            : "border-gray-200 bg-white hover:border-[#8dbfda]/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#1a2538]">
                              Pay Online
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Complete payment now using Razorpay.
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-[#8dbfda]">
                            {paymentMethod === "online" ? "Selected" : ""}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cod")}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          paymentMethod === "cod"
                            ? "border-[#8dbfda] bg-[#f0f9ff]"
                            : "border-gray-200 bg-white hover:border-[#8dbfda]/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#1a2538]">
                              Cash on Delivery
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Pay in cash at the time of your appointment.
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-[#8dbfda]">
                            {paymentMethod === "cod" ? "Selected" : ""}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleProceedToPayment}
                    disabled={cartItems.length === 0 || submitting}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#8dcae4] to-[#79bada] text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {paymentMethod === "cod"
                      ? "BOOK WITH CASH ON DELIVERY"
                      : "PAY & BOOK NOW"}
                  </button>

                  <div className="mt-4 flex items-center justify-center gap-2 text-[0.75rem] text-gray-400">
                    <ShieldCheck size={16} className="text-[#8dbfda]" />
                    <span>
                      {paymentMethod === "cod"
                        ? "Your selected payment method will be saved with the booking."
                        : "Secure 256-bit SSL encrypted payment"}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
