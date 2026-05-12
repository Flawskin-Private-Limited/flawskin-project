import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaChevronDown,
} from "react-icons/fa";

import logo from "../assets/logo.png";

const Footer = () => {
  const [open, setOpen] = useState(null);
  const toggle = (section) => setOpen(open === section ? null : section);

  const quickLinks = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Women Services", path: "/women-service" },
    { name: "Men Services", path: "/men-service" },
    { name: "Contact", path: "/contact" },
  ];

  const treatments = [
    "Laser Hair Removal",
    "Skin Rejuvenation",
    "Anti-Aging Facials",
    "Full Body Grooming",
    "Consultation",
  ];

  const contactInfo = [
    {
      icon: <FaMapMarkerAlt className="text-blue-300 mt-1" />,
      text: "Anjanapura Village, 8th Phase, Anjanapura Twp, Vaddarapalya, Bengaluru, Karnataka 560108",
      link: "https://www.google.com/maps/place/Flawskin+pvt+Ltd/@12.8615,77.569008,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae15007fd77661:0xc1d60165ac492c92!8m2!3d12.8614948!4d77.5715829!16s%2Fg%2F11vy47g633?entry=ttu&g_ep=EgoyMDI2MDUwMi4wIKXMDSoASAFQAw%3D%3D",
    },
    {
      icon: <FaPhoneAlt className="text-blue-300" />,
      text: "+91 7892644030",
      link: "tel:+917892644030",
    },
    {
      icon: <FaEnvelope className="text-blue-300" />,
      text: "contact@flawskin.com",
      link: "mailto:contact@flawskin.com",
    },
  ];

  const renderList = (items, isLink = false) => (
    <ul className="space-y-1.5 text-[14px]">
      {items.map((item, i) => (
        <li key={i} className="hover:text-white transition">
          {isLink ? <Link to={item.path}>{item.name}</Link> : item}
        </li>
      ))}
    </ul>
  );

  return (
    <footer className="bg-[#0b1d39] text-gray-400">
      <div className="w-full max-w-[1500px] mx-auto px-6 md:px-10 lg:px-16 xl:px-20 py-10">
        {/* ================= DESKTOP ================= */}
        <div className="hidden lg:grid grid-cols-4 gap-20 xl:gap-28 items-start">
          {/* Column 1 */}
          <div>
            <div className="flex items-center gap-1 mb-4">
              <img
                src={logo}
                alt="FlawSkin Logo"
                className="w-7 h-7 object-contain drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]"
              />

              <h2 className="text-white text-lg font-semibold tracking-wide">
                FLAWSKIN
              </h2>
            </div>

            <p className="text-[14px] leading-6 max-w-md ">
              FlawSkin is a leading provider of medical-grade laser hair
              reduction services. We combine advanced FDA-approved technology
              with the convenience of in-home treatments.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-base font-semibold mb-2">
              Quick Links
            </h3>
            <div className="w-8 h-[3px] bg-blue-300 mb-2"></div>
            {renderList(quickLinks, true)}
          </div>

          {/* Treatments */}
          <div>
            <h3 className="text-white text-base font-semibold mb-2">
              Treatments
            </h3>
            <div className="w-8 h-[3px] bg-blue-300 mb-2"></div>
            {renderList(treatments)}
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white text-base font-semibold mb-2">
              Contact Info
            </h3>
            <div className="w-8 h-[3px] bg-blue-300 mb-2"></div>

            <div className="space-y-2 text-[14px]">
              {contactInfo.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  {item.icon}

                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition"
                  >
                    {item.text}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= MOBILE ================= */}
        <div className="lg:hidden space-y-6">
          <div>
            <div className="flex items-center gap-1 mb-2">
              <img
                src={logo}
                alt="FlawSkin Logo"
                className="w-6 h-6 object-contain"
              />

              <h2 className="text-white text-base font-semibold tracking-wide leading-none">
                FLAWSKIN
              </h2>
            </div>

            <p className="text-sm leading-6">
              FlawSkin is a leading provider of medical-grade laser hair
              reduction services. We combine advanced FDA-approved technology
              with the convenience of in-home treatments.
            </p>
          </div>

          {[
            { key: "quick", title: "Quick Links", items: quickLinks },
            { key: "treat", title: "Treatments", items: treatments },
            { key: "contact", title: "Contact Info", items: contactInfo },
          ].map((section) => (
            <div key={section.key}>
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex justify-between items-center"
              >
                <h3 className="text-white font-semibold text-base">
                  {section.title}
                </h3>

                <FaChevronDown
                  className={`transition-transform ${
                    open === section.key ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  open === section.key ? "max-h-96 mt-3" : "max-h-0"
                }`}
              >
                {section.key === "quick" ? (
                  <ul className="space-y-3 text-sm mt-3">
                    {section.items.map((item, i) => (
                      <li key={i}>
                        <Link to={item.path}>{item.name}</Link>
                      </li>
                    ))}
                  </ul>
                ) : section.key === "treat" ? (
                  <ul className="space-y-3 text-sm mt-3">
                    {treatments.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-4 text-sm mt-3">
                    {contactInfo.map((item, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        {item.icon}

                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition"
                        >
                          {item.text}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ================= WATERMARK BRAND ================= */}

        <div className="group flex flex-col items-center justify-center py-2 select-none text-center cursor-default">
          <h1
            className="
            text-[80px] sm:text-[100px] md:text-[130px] lg:text-[150px]
            font-extrabold
            tracking-[8px] md:tracking-[12px]
            leading-none
            bg-gradient-to-b from-white/10 to-white/0
            bg-clip-text text-transparent
            transition-all duration-500
            group-hover:from-white/40
            group-hover:to-white/10
            group-hover:drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]
            "
          >
            FLAW
          </h1>

          <h2
            className="
            text-[26px] sm:text-[32px] md:text-[42px] lg:text-[54px]
            font-semibold
            tracking-[12px] md:tracking-[16px]
            -mt-2
            text-white/20
            transition-all duration-500
            group-hover:text-white/60
            group-hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]
            "
          >
            SKIN
          </h2>
        </div>

        <div className="border-t border-white/10 pt-4"></div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6 text-sm">
          <div className="flex justify-center lg:justify-end gap-6">
            {[
              {
                icon: FaInstagram,
                link: "https://www.instagram.com/flawskin_/",
              },
              {
                icon: FaLinkedinIn,
                link: "https://linkedin.com/company/yourcompany",
              },
            ].map(({ icon: Icon, link }, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="
      w-11 h-11
      rounded-full
      bg-[#162845]
      flex items-center justify-center
      transition-all duration-300
      cursor-pointer
      hover:bg-[#1f3a63]
      hover:scale-110
      hover:shadow-[0_0_15px_rgba(255,255,255,0.25)]
    "
              >
                <Icon className="text-gray-300 text-sm hover:text-white transition" />
              </a>
            ))}
          </div>

          <div className="flex justify-center items-center gap-6">
            <Link
              to="/terms-and-policy"
              className="hover:text-white cursor-pointer transition"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-and-policy"
              className="hover:text-white cursor-pointer transition"
            >
              Terms & Conditions
            </Link>
          </div>
          <div className="text-center lg:text-left space-y-1">
            <p>
              © 2024-{new Date().getFullYear()} FlawSkin Private Limited. All
              rights reserved.
            </p>

            <a
              href=" https://portfolio-chandu-gamma.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="
      inline-flex items-center
      text-xs
      text-gray-500
      hover:text-blue-300
      transition-all duration-300
    "
            >
              Design & Developed by Siripireddy Chandu
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
