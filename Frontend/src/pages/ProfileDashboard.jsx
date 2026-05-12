import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { MdLogout, MdOutlineLightMode, MdSupportAgent } from "react-icons/md";
import { LuLayoutDashboard, LuMessageSquareText } from "react-icons/lu";
import { CgGirl } from "react-icons/cg";
import { toast } from "sonner";
import api from "../api/axios";
import { PhoneArrowDownLeftIcon } from "@heroicons/react/24/outline";
import {
  BellIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  HomeIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhoneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { auth } from "../firebase/config";
import { getStoredProfile } from "../utils/profileData";
import { clearAuthSession, getCurrentUserId } from "../utils/authSession";
import {
  cancelBooking,
  onUserBookingsChange,
} from "../firebase/bookingService";
import {
  deleteAddress as deleteFirestoreAddress,
  getAddresses,
  setDefaultAddress as setFirestoreDefault,
} from "../firebase/addressService";
import { submitContactForm } from "../firebase/feedbackService";
import logo from "../assets/logo.png";

const MAX_ADDRESSES = 5;

function getSectionFromPath(pathname) {
  if (pathname.includes("/profile-dashboard/bookings")) return "bookings";
  if (pathname.includes("/profile-dashboard/addresses")) return "addresses";
  if (pathname.includes("/profile-dashboard/support")) return "support";
  return "overview";
}

function buildFullAddress(address) {
  return (
    address?.fullAddress ||
    [
      address?.house,
      address?.building,
      address?.landmark,
      address?.selectedAddress,
    ]
      .filter(Boolean)
      .join(", ")
  );
}

function mapBooking(booking) {
  const raw = String(booking.status || "upcoming").toLowerCase();

  const isRefundInitiated =
    raw === "cancelled" &&
    booking.paymentMethod === "online" &&
    booking.paymentStatus === "paid";

  const status =
    raw === "completed"
      ? "Completed"
      : isRefundInitiated
        ? "Refund Initiated"
        : raw === "cancelled"
          ? "Cancelled"
          : "Upcoming";

  return {
    ...booking,

    // 🔥 ADD THESE (CRITICAL)
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    paymentId: booking.paymentId,

    uiTitle:
      booking.serviceName ||
      booking.services?.[0]?.name ||
      booking.title ||
      "Laser Treatment",

    uiDate: booking.date || "Date not selected",
    uiTime: booking.timeSlot || booking.time || "",
    uiStatus: status,
  };
}

function sidebarClasses(isActive) {
  return `flex items-center gap-3 px-4 py-3 rounded-full font-medium transition-all ${
    isActive
      ? "bg-sky-400 text-white"
      : "hover:bg-sky-400 hover:text-white text-gray-600"
  }`;
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SupportCard({ icon, title, desc, onClick }) {
  return (
    <div
      className={`p-6 rounded-2xl shadow-sm flex gap-4 items-center bg-white transition-all ${
        onClick ? "cursor-pointer hover:shadow-md active:scale-[0.99]" : ""
      }`}
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function MobileMenuItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-14 px-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/60 transition"
    >
      <span className="w-5 h-5 shrink-0">{icon}</span>
      <span className="text-[15px] font-medium text-slate-700">{label}</span>
      <ChevronRightIcon className="w-4 h-4 ml-auto text-slate-400" />
    </button>
  );
}

function MobileTreatmentCard({ title, date, time, status, icon }) {
  const tone =
    status === "Cancelled"
      ? "bg-rose-100 text-rose-600"
      : status === "Completed"
        ? "bg-slate-200 text-slate-600"
        : "bg-emerald-100 text-emerald-700";

  return (
    <div className="rounded-2xl border bg-white border-slate-100 p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-white border border-sky-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 truncate">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {date} • {time}
          </p>
        </div>
        <span
          className={`ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full ${tone}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

export default function ProfileDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const section = getSectionFromPath(location.pathname);

  const [profile, setProfile] = useState(() => getStoredProfile());
  const [bookings, setBookings] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showRefundPopup, setShowRefundPopup] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeBookingTab, setActiveBookingTab] = useState("Upcoming");
  const [supportForm, setSupportForm] = useState({
    full_name: "",
    email: "",
    message: "",
  });
  const [isCancelling, setIsCancelling] = useState(false);
  const [supportMessage, setSupportMessage] = useState({ type: "", text: "" });
  const [isSupportSubmitting, setIsSupportSubmitting] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => booking.uiStatus === activeBookingTab);
  }, [bookings, activeBookingTab]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const paginatedBookings = filteredBookings.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [activeBookingTab]);
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId || userId === "guest_user") return;

    let isMounted = true;

    const setup = async () => {
      try {
        const { onProfileChange } = await import("../firebase/profileService");
        if (!isMounted) return;

        const unsubProfile = onProfileChange(userId, (data) => {
          if (data) {
            setProfile(data);
            localStorage.setItem("profileData", JSON.stringify(data));
          }
        });

        const unsubBookings = onUserBookingsChange(userId, (rows) => {
          setBookings(rows.map(mapBooking));
        });

        const remoteAddresses = await getAddresses(userId).catch(() => []);
        if (isMounted) {
          setAddresses(
            remoteAddresses.map((item, index) => ({
              ...item,
              id: item.id || `addr-${index}`,
              saveAs: item.saveAs || "Home",
              fullAddress: buildFullAddress(item),
              isDefault: Boolean(item.isDefault),
            })),
          );
        }

        return () => {
          unsubProfile?.();
          unsubBookings?.();
        };
      } catch (error) {
        console.error("Error loading dashboard:", error);
        return () => {};
      }
    };

    let cleanup = () => {};
    setup().then((fn) => {
      cleanup = fn || (() => {});
    });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    setSupportForm((prev) => ({
      ...prev,
      full_name: profile?.fullName || prev.full_name,
      email: profile?.email || prev.email,
    }));
  }, [profile]);

  const defaultAddress = useMemo(
    () => addresses.find((item) => item.isDefault) || null,
    [addresses],
  );

  const goToSection = (nextSection) => {
    const path =
      nextSection === "overview"
        ? "/profile-dashboard"
        : `/profile-dashboard/${nextSection}`;
    navigate(path);
  };

  const handleConfirmRefund = async () => {
    if (!selectedBooking || isCancelling) return;

    try {
      setIsCancelling(true);

      const isOnline =
        selectedBooking.paymentMethod === "online" &&
        selectedBooking.paymentStatus === "paid";

      // Refund only for online paid bookings
      if (isOnline) {
        await api.post("/refund", {
          paymentId: selectedBooking.paymentId,
          amount: selectedBooking.total,
        });
      }

      // Cancel booking
      await cancelBooking(getCurrentUserId(), selectedBooking.id);

      setShowRefundPopup(false);
      setSelectedBooking(null);

      toast.success(
        isOnline
          ? "Booking cancelled. Refund initiated."
          : "COD booking cancelled successfully.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        selectedBooking?.paymentMethod === "online"
          ? "Refund failed."
          : "Cancellation failed.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    signOut(auth).catch(() => {});
    localStorage.removeItem("profileData");
    navigate("/sign-in");
  };

  const handleBookingAction = async (booking) => {
    try {
      if (booking.uiStatus === "Upcoming") {
        await cancelBooking(getCurrentUserId(), booking.id);
      }
    } catch (error) {
      console.error("Booking action failed:", error);
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    setAddresses((prev) =>
      prev.map((item) => ({
        ...item,
        isDefault: item.id === addressId,
      })),
    );

    try {
      await setFirestoreDefault(getCurrentUserId(), addressId);
    } catch (error) {
      console.error("Failed to set default address:", error);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    setAddresses((prev) => {
      const next = prev.filter((item) => item.id !== addressId);
      return next.map((item, index) => ({
        ...item,
        isDefault: next.some((entry) => entry.isDefault)
          ? item.isDefault
          : index === 0,
      }));
    });

    try {
      await deleteFirestoreAddress(getCurrentUserId(), addressId);
    } catch (error) {
      console.error("Failed to delete address:", error);
    }
  };
  const handleEditAddress = (item) => {
    navigate("/select-location", {
      state: {
        source: "edit-address",
        address: item,
      },
    });
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();

    if (!supportForm.full_name || !supportForm.email || !supportForm.message) {
      setSupportMessage({
        type: "error",
        text: "Please fill all support fields.",
      });
      return;
    }

    try {
      setIsSupportSubmitting(true);
      await submitContactForm(supportForm);
      setSupportMessage({
        type: "success",
        text: "Message sent successfully.",
      });
      setSupportForm((prev) => ({ ...prev, message: "" }));
    } catch (error) {
      console.error("Support submit failed:", error);
      setSupportMessage({ type: "error", text: "Failed to send message." });
    } finally {
      setIsSupportSubmitting(false);
    }
  };

  const renderOverview = () => (
    <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
      <div className="flex-1 w-full lg:max-w-none">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h4 className="text-sm font-medium tracking-widest text-gray-400">
            RECENT TREATMENTS
          </h4>
          <button
            onClick={() => goToSection("bookings")}
            className="text-sm font-medium text-sky-500 hover:underline"
          >
            View History
          </button>
        </div>

        <div className="lex flex-col sm:flex-row flex-wrap gap-4 md:gap-6 mb-8 md:mb-10 w-full">
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full bg-white rounded-2xl p-8 border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">
                No recent bookings found
              </p>
              <button
                onClick={() => navigate("/women-service")}
                className="mt-4 px-6 py-2 bg-sky-50 text-sky-500 hover:bg-sky-100 hover:text-sky-600 font-semibold rounded-full transition"
              >
                Book New Service
              </button>
            </div>
          ) : (
            bookings.slice(0, 2).map((item, index) => (
              <div
                key={item.id}
                className={`flex-1 w-full p-4 md:p-6 rounded-2xl shadow-sm relative transition-colors ${
                  index === 0
                    ? "bg-gradient-to-r from-sky-50 to-white border border-sky-100"
                    : "bg-white border border-slate-100"
                }`}
              >
                <div className="flex gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 bg-white shadow-sm border border-sky-50">
                    {index % 2 === 0 ? (
                      <MdOutlineLightMode className="w-5 h-5 md:w-6 md:h-6 text-sky-500" />
                    ) : (
                      <CgGirl className="w-5 h-5 md:w-7 md:h-7 text-sky-400" />
                    )}
                  </div>
                  <div className="pr-16">
                    <h3 className="font-semibold text-sm md:text-base text-slate-800">
                      {item.uiTitle}
                    </h3>
                    <p className="text-xs mt-1 text-gray-400">
                      {item.uiDate} • {item.uiTime}
                    </p>
                  </div>
                </div>
                <span className="absolute top-4 right-4 md:top-6 md:right-6 text-[10px] md:text-xs font-semibold px-2 py-1 md:px-3 md:py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {item.uiStatus.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>

        <h4 className="text-sm font-medium tracking-widest mb-4 md:mb-6 text-gray-400">
          PRIMARY LOCATION
        </h4>

        <div className="p-5 md:p-8 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
          <div className="flex gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
              <HomeIcon className="w-5 h-5 md:w-6 md:h-6 text-sky-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1 md:mb-2 text-sm md:text-base text-slate-800">
                Home Address
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                {defaultAddress
                  ? buildFullAddress(defaultAddress)
                  : "No address saved yet."}
              </p>
            </div>
          </div>

          <button
            onClick={() => goToSection("addresses")}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-medium bg-sky-50 hover:bg-sky-100 text-sky-500"
          >
            <PencilSquareIcon className="w-4 h-4" />
            Manage Addresses
          </button>
        </div>
      </div>

      <div className="w-full lg:w-80">
        <div className="space-y-5">
          <SupportCard
            icon={<LuMessageSquareText className="w-6 h-6 text-green-500" />}
            title="WhatsApp Support"
            desc="Chat with our team instantly"
            onClick={() => window.open("https://wa.me/+917892644030", "_blank")}
          />
          <SupportCard
            icon={<PhoneIcon className="w-6 h-6 text-blue-500" />}
            title="Concierge Desk"
            desc="Priority assistance for members"
            onClick={() => goToSection("support")}
          />
          <SupportCard
            icon={<PhoneArrowDownLeftIcon className="w-6 h-6 text-sky-500" />}
            title="Request a Call"
            desc="We'll call you back at your time"
            onClick={() => navigate("/request-callback")}
          />
        </div>
      </div>
    </div>
  );

  const renderBookings = () => (
    <>
      <SectionHeading
        title="My Bookings"
        // subtitle="Your bookings now open inside the dashboard without leaving this page."
      />
      <div className="flex items-center gap-4 sm:gap-8 border-b border-slate-200 mb-8 pl-1 overflow-x-auto whitespace-nowrap no-scrollbar pb-1">
        {["Upcoming", "Completed", "Cancelled", "Refund Initiated"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveBookingTab(tab)}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeBookingTab === tab
                  ? "text-sky-500"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {tab}
              {activeBookingTab === tab ? (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-400 rounded-t-full" />
              ) : null}
            </button>
          ),
        )}
      </div>

      <div className="space-y-4">
        {paginatedBookings.length === 0 ? (
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center text-center min-h-[420px]">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              No {activeBookingTab} Bookings
            </h2>
            <p className="text-slate-500 mb-8">
              You don&apos;t have any {activeBookingTab.toLowerCase()}{" "}
              appointments right now.
            </p>
          </div>
        ) : (
          paginatedBookings.map((item) => (
            <div
              key={item.id}
              className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              {/* 🔥 Perfect Ribbon */}
              <div className="hidden sm:block absolute top-0 right-0 w-24 h-24 pointer-events-none">
                <div
                  className={`absolute top-4 right-[-28px] rotate-45 text-[10px] font-bold text-white text-center w-40 py-1 shadow-md ${
                    item.paymentMethod === "online"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                >
                  {item.paymentMethod === "online" ? "ONLINE PAID" : "COD"}
                </div>
              </div>
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-sky-50">
                  <CalendarDaysIcon className="w-6 h-6 text-sky-500" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-slate-800 truncate">
                    {item.uiTitle}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 truncate">
                    {item.uiDate} • {item.uiTime}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  {item.uiStatus.toUpperCase()}
                </span>
                {item.uiStatus === "Upcoming" ? (
                  <button
                    onClick={() => {
                      // Open popup for BOTH Online & COD
                      setSelectedBooking(item);
                      setShowRefundPopup(true);
                    }}
                    className="px-4 py-2 rounded-full text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      {filteredBookings.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
          {/* Prev */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            Prev
          </button>

          {/* Numbers */}
          {[...Array(totalPages)].map((_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  currentPage === page
                    ? "bg-sky-500 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next */}
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </>
  );

  const renderAddresses = () => (
    <>
      <SectionHeading
        title="Saved Addresses"
        // subtitle="Manage addresses in the center panel while the dashboard sidebar and top bar stay fixed."
      />
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() =>
            navigate("/select-location", { state: { source: "saved-address" } })
          }
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium transition"
        >
          + Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          No saved addresses yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {addresses.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-lg font-semibold text-slate-800">
                    {item.saveAs || "Home"}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-500 break-words">
                    {buildFullAddress(item)}
                  </p>
                </div>
                {item.isDefault ? (
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                    DEFAULT
                  </span>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() =>
                    navigate("/select-location", {
                      state: {
                        source: "edit-address",
                        address: item,
                      },
                    })
                  }
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Edit
                </button>

                {!item.isDefault ? (
                  <button
                    onClick={() => handleSetDefaultAddress(item.id)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 transition"
                  >
                    Set Default
                  </button>
                ) : null}

                <button
                  onClick={() => handleDeleteAddress(item.id)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition flex items-center justify-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addresses.length >= MAX_ADDRESSES ? (
        <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
          Maximum {MAX_ADDRESSES} addresses allowed. Delete one to add another.
        </div>
      ) : null}
    </>
  );

  const renderSupport = () => (
    <>
      <SectionHeading
        title="Help & Support"
        // subtitle="Support now opens in the dashboard content area instead of a separate page."
      />
      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          {supportMessage.text ? (
            <div
              className={`mb-6 rounded-xl px-4 py-3 text-sm ${
                supportMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}
            >
              {supportMessage.text}
            </div>
          ) : null}

          <form onSubmit={handleSupportSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={supportForm.full_name}
                onChange={(e) =>
                  setSupportForm((prev) => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={supportForm.email}
                onChange={(e) =>
                  setSupportForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message
              </label>
              <textarea
                rows="6"
                value={supportForm.message}
                onChange={(e) =>
                  setSupportForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="How can we help you?"
              />
            </div>
            <button
              type="submit"
              disabled={isSupportSubmitting}
              className="px-6 py-3 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-medium transition disabled:opacity-70"
            >
              {isSupportSubmitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <SupportCard
            icon={<LuMessageSquareText className="w-6 h-6 text-green-500" />}
            title="WhatsApp Support"
            desc="Chat with our team instantly"
            onClick={() => window.open("https://wa.me/+917892644030", "_blank")}
          />
          <SupportCard
            icon={<PhoneIcon className="w-6 h-6 text-blue-500" />}
            title="Call Concierge"
            desc="Talk directly with our support team"
            onClick={() => window.open("tel:+917892644030", "_self")}
          />
          <SupportCard
            icon={<PhoneArrowDownLeftIcon className="w-6 h-6 text-sky-500" />}
            title="Request a Callback"
            desc="Choose a time and we will call you"
            onClick={() => navigate("/request-callback")}
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="lg:hidden min-h-screen bg-[#f3f5f7] px-4 pt-8 pb-8">
        <div className="mx-auto w-full max-w-md sm:max-w-lg">
          <div className="flex items-center justify-between mb-4">
            {/* Back Arrow */}
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm"
            >
              <ChevronRightIcon className="w-5 h-5 rotate-180 text-slate-700" />
            </button>

            {/* Empty space for center alignment */}
            <div className="w-10" />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={profile?.image || "/female.png"}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-sky-100"
                alt="profile"
              />
              <button
                className="absolute right-0 bottom-0 w-7 h-7 rounded-full bg-sky-400 text-white border-2 border-white flex items-center justify-center"
                onClick={() => navigate("/profile-settings")}
              >
                <PencilSquareIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <h1 className="mt-4 text-3xl font-bold text-slate-800 leading-none">
              {profile?.fullName || "User"}
            </h1>
          </div>

          <div className="mt-8 bg-[#ebeff3] rounded-2xl p-2">
            <MobileMenuItem
              icon={<LuLayoutDashboard className="w-5 h-5 text-sky-500" />}
              label="Overview"
              onClick={() => goToSection("overview")}
            />
            <MobileMenuItem
              icon={<CalendarDaysIcon className="w-5 h-5 text-sky-500" />}
              label="My Bookings"
              onClick={() => goToSection("bookings")}
            />
            <MobileMenuItem
              icon={<MapPinIcon className="w-5 h-5 text-sky-500" />}
              label="Manage Addresses"
              onClick={() => goToSection("addresses")}
            />
            <MobileMenuItem
              icon={<MdSupportAgent className="w-5 h-5 text-sky-500" />}
              label="Help & Support"
              onClick={() => goToSection("support")}
            />
            <MobileMenuItem
              icon={<MdLogout className="w-5 h-5 text-red-500" />}
              label="Logout"
              onClick={handleLogout}
            />
          </div>

          <div className="mt-8">
            {section === "bookings"
              ? renderBookings()
              : section === "addresses"
                ? renderAddresses()
                : section === "support"
                  ? renderSupport()
                  : renderOverview()}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex min-h-screen bg-blue-50">
        <aside className="w-72 border-r flex flex-col justify-between p-6 bg-white border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-10">
              <img
                src={logo}
                alt="FLAWSKIN Logo"
                className="w-9 h-9 object-contain shrink-0"
              />
              <h1 className="font-bold text-lg text-slate-800 tracking-[0.14em]">
                FLAWSKIN
              </h1>
            </div>

            <nav className="space-y-3">
              <NavLink
                to="/profile-dashboard"
                end
                className={({ isActive }) => sidebarClasses(isActive)}
              >
                <LuLayoutDashboard className="w-5 h-5" />
                Dashboard Overview
              </NavLink>
              <NavLink
                to="/profile-dashboard/bookings"
                className={({ isActive }) => sidebarClasses(isActive)}
              >
                <CalendarDaysIcon className="w-5 h-5" />
                My Bookings
              </NavLink>
              <NavLink
                to="/profile-dashboard/addresses"
                className={({ isActive }) => sidebarClasses(isActive)}
              >
                <MapPinIcon className="w-5 h-5" />
                Manage Addresses
              </NavLink>
              <NavLink
                to="/profile-dashboard/support"
                className={({ isActive }) => sidebarClasses(isActive)}
              >
                <MdSupportAgent className="w-5 h-5" />
                Help & Support
              </NavLink>
            </nav>
          </div>

          <div
            onClick={handleLogout}
            className="flex items-center font-medium gap-2 text-red-500 cursor-pointer p-3 rounded-xl mt-auto hover:bg-red-50"
          >
            <MdLogout className="w-5 h-5 shrink-0" />
            Logout Account
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
          <header className="border-b px-4 sm:px-6 md:px-10 py-3 sm:py-4 md:py-6 justify-between items-center sticky top-0 z-30 bg-white border-gray-200 flex">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={profile?.image || "/female.png"}
                  className="w-14 h-14 rounded-full object-cover border-4 border-blue-100"
                  alt="profile"
                />
                <button
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-400 rounded-full flex items-center justify-center border-2 border-white cursor-pointer hover:bg-sky-500"
                  onClick={() => navigate("/profile-settings")}
                  aria-label="Edit profile image"
                >
                  <PencilSquareIcon className="w-3 h-3 text-white" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  {profile?.fullName || "User"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                <BellIcon className="w-5 h-5" />
              </div>

              <div
                onClick={() => navigate("/profile-settings")}
                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </div>
            </div>
          </header>

          <div className="p-4 md:p-10">
            {section === "bookings"
              ? renderBookings()
              : section === "addresses"
                ? renderAddresses()
                : section === "support"
                  ? renderSupport()
                  : renderOverview()}
          </div>
        </div>
      </div>

      {showRefundPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm text-center">
            <h3 className="text-lg font-bold mb-2">Cancel Booking?</h3>
            <p className="text-sm text-gray-500 mb-6">
              {selectedBooking?.paymentMethod === "online"
                ? "Your refund will be processed within 5–7 working days."
                : "Are you sure you want to cancel this COD booking?"}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => !isCancelling && setShowRefundPopup(false)}
                disabled={isCancelling}
                className="flex-1 py-2 rounded-lg border disabled:opacity-50"
              >
                No
              </button>

              <button
                onClick={handleConfirmRefund}
                disabled={isCancelling}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white disabled:opacity-50"
              >
                {isCancelling ? "Processing..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
