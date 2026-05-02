import { useEffect, useState } from "react";

/**
 * =========================
 * NAVIGATION
 * =========================
 */
const NAV_ITEMS = ["HOME", "ABOUT", "PROJECTS", "DASHBOARD", "CONTACT"];

/**
 * =========================
 * CASE STUDY DATA
 * =========================
 */
const PROJECTS = [
  {
    name: "Kibali Ministry",
    url: "https://www.kibaliministry.org",
    type: "Ministry Platform",
    problem: "Needed centralized digital communication platform for sermons and updates.",
    solution: "Built structured content system with sermon, events, and mobile-first UI.",
    stack: "WordPress, PHP, JavaScript, HTML, CSS",
    outcome: "Improved engagement and streamlined communication.",
  },
  {
    name: "LumiCore",
    url: "https://www.lumicore.co.ke",
    type: "Corporate Website",
    problem: "Lacked structured digital brand identity.",
    solution: "Designed corporate UI with service-driven architecture.",
    stack: "WordPress, SEO, HTML, CSS, JS",
    outcome: "Increased credibility and inbound client flow.",
  },
  {
    name: "Meshack Live",
    url: "https://www.meshakhlive.co.ke",
    type: "Portfolio",
    problem: "Needed centralized developer identity hub.",
    solution: "Built SaaS-style portfolio with projects & systems showcase.",
    stack: "React, Tailwind CSS, JavaScript",
    outcome: "Professional visibility and positioning as systems engineer.",
  },
  {
    name: "Global Cathedral",
    url: "https://www.theglobalcathedral.org",
    type: "Church Platform",
    problem: "Global outreach lacked structured digital system.",
    solution: "Built scalable ministry content platform.",
    stack: "WordPress, PHP, MySQL",
    outcome: "Expanded global accessibility of teachings.",
  },
];

/**
 * =========================
 * MAIN APP
 * =========================
 */
export default function App() {
  const [active, setActive] = useState("HOME");

  /**
   * LIVE ANALYTICS STATE
   */
  const [analytics, setAnalytics] = useState({
    views: 1280,
    projectClicks: 342,
    contactClicks: 89,
  });

  /**
   * =========================
   * LIVE SIMULATION ENGINE
   * =========================
   * Mimics real-time SaaS analytics updates
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalytics((prev) => ({
        views: prev.views + Math.floor(Math.random() * 3),
        projectClicks: prev.projectClicks + Math.floor(Math.random() * 2),
        contactClicks:
          prev.contactClicks + (Math.random() > 0.75 ? 1 : 0),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans">

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-black/70 backdrop-blur border-b border-white/10 px-6 py-4 flex justify-between items-center">

        <h1 className="text-sm md:text-lg font-bold">
          Meshack Mulliro | Product Engineer
        </h1>

        <nav className="flex gap-4 md:gap-6 text-xs md:text-sm text-white/60">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`hover:text-white transition ${
                active === item ? "text-white" : ""
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

      </header>

      {/* ROUTING */}
      {active === "HOME" && <Home />}
      {active === "ABOUT" && <About />}
      {active === "PROJECTS" && <Projects setAnalytics={setAnalytics} />}
      {active === "DASHBOARD" && <Dashboard analytics={analytics} />}
      {active === "CONTACT" && <Contact setAnalytics={setAnalytics} />}

      {/* FOOTER */}
      <footer className="text-center py-10 border-t border-white/10 text-white/60 text-sm">

        {/* MAIN COPYRIGHT */}
        <div>
          © {new Date().getFullYear()} Meshack Mulliro. All rights reserved.
        </div>

        {/* SAVVION LINE (CENTERED MIDDLE TEXT) */}
        <div className="mt-2 text-white/50">
          Savvion Agency | www.savvion.co.ke
        </div>

        {/* SOCIAL LINKS (BELOW MIDDLE LINE) */}
        <div className="flex justify-center gap-8 mt-6 text-white/60">

          <a
            href="www.linkedin.com/in/emmeshack"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 hover:text-white transition hover:bg-white/10 rounded-lg"
          >
            LinkedIn
          </a>

          <a
            href="https://wa.me/+254713082563"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 hover:text-white transition hover:bg-white/10 rounded-lg"
          >
            WhatsApp
          </a>    

          <a
            href="https://x.com/meshakh_savvion"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 hover:text-white transition hover:bg-white/10 rounded-lg"
          >
            X / Twitter
          </a>

        </div>

      </footer>
    </div>
  );
}

/**
 * =========================
 * HOME
 * =========================
 */
function Home() {
  return (
    <section className="h-[85vh] flex flex-col justify-center items-center text-center px-6">
      <h2 className="text-4xl md:text-6xl font-bold">
        Building <span className="text-indigo-400">Systems</span>, Not Just Websites
      </h2>

      <p className="mt-6 text-white/60 max-w-2xl text-sm md:text-base">
       Full Stack Developer focused on conversion-first web systems and scalable digital platforms that turn traffic into leads.</p>
    </section>
  );
}

<div className="flex justify-center mb-8">
  <div className="p-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
    <img
      src="/profile.jpg"
      alt="EM. Meshakh"
      className="w-40 h-40 md:w-52 md:h-52 object-cover rounded-full border-4 border-black shadow-2xl"
      className="animate-pulse"
    />
  </div>
</div>

/**
 * =========================
 * ABOUT
 * =========================
 */
function About() {
  return (
    <section className="px-6 py-16 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">About Me</h2>

      <p className="text-white/70 mb-10">
        CRM Consultant | Web Developer | B2B Growth & Lead Generation Strategist | Digital Systems Architect.
      </p>

      <div className="flex flex-col lg:flex-row items-center gap-8 mb-10">
        <img
          src="/profile.jpg"
          alt="Meshack Mulliro"
          className="w-56 h-56 object-cover rounded-3xl border border-white/10 shadow-xl"
        />

        <div className="text-white/70 max-w-2xl leading-relaxed">
          I blend modern web technology with business systems, building SaaS platforms and customer-facing digital products that scale.
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 text-sm">

        <Box title="Frontend" content="HTML, CSS, JS, React, GSAP, Tailwind" />
        <Box title="Backend" content="Node.js, PHP, Python, APIs, Databases" />
        <Box title="Infrastructure" content="Google Cloud, AWS, Cloudflare, firebase" />
        <Box title="CRM Systems" content="HubSpot, Zoho, Salesforce" />

      </div>
    </section>
  );
}

/**
 * =========================
 * PROJECTS (CASE STUDIES)
 * =========================
 */
function Projects({ setAnalytics }) {
  return (
    <section className="px-6 py-16 max-w-6xl mx-auto">

      <h2 className="text-3xl font-bold mb-10">CASE STUDIES</h2>

      <div className="grid md:grid-cols-2 gap-6">

        {PROJECTS.map((p) => (
          <div
            key={p.name}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3"
            onClick={() =>
              setAnalytics((prev) => ({
                ...prev,
                projectClicks: prev.projectClicks + 1,
              }))
            }
          >

            <h3 className="text-indigo-400 text-xl font-semibold">{p.name}</h3>
            <p className="text-xs text-white/50">{p.type}</p>

            <Case title="Problem" text={p.problem} />
            <Case title="Solution" text={p.solution} />
            <Case title="Stack" text={p.stack} />
            <Case title="Outcome" text={p.outcome} />

            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-3 px-4 py-2 bg-indigo-500 rounded-lg text-sm hover:bg-indigo-600"
            >
              LIVE SITE →
            </a>

          </div>
        ))}

      </div>
    </section>
  );
}

/**
 * =========================
 * DASHBOARD (LIVE ANALYTICS)
 * =========================
 */
function Dashboard({ analytics }) {
  return (
    <section className="px-6 py-16 max-w-4xl mx-auto">

      <h2 className="text-3xl font-bold mb-8">LIVE ANALYTICS</h2>

      <div className="grid md:grid-cols-3 gap-6">

        <Stat label="Views" value={analytics.views} />
        <Stat label="Project Clicks" value={analytics.projectClicks} />
        <Stat label="Contact Clicks" value={analytics.contactClicks} />

      </div>
    </section>
  );
}

/**
 * =========================
 * CONTACT
 * =========================
 */
function Contact({ setAnalytics }) {
  return (
    <section className="px-6 py-16 max-w-xl mx-auto text-center">

      <h2 className="text-3xl font-bold mb-6">CONTACT</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setAnalytics((prev) => ({
            ...prev,
            contactClicks: prev.contactClicks + 1,
          }));
        }}
        className="space-y-3"
      >

        <input
          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl"
          placeholder="Email"
        />

        <textarea
          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl h-28"
          placeholder="Message"
        />

        <button className="w-full py-3 bg-indigo-500 rounded-xl hover:bg-indigo-600">
          SEND MESSAGE
        </button>

      </form>

      <div className="flex justify-center gap-6 mt-4 text-sm text-white/60">

        {/* LinkedIn */}
        <a
          href="www.linkedin.com/in/emmeshack"
          target="_blank"
          rel="noreferrer"
          className="hover:text-white transition"
        >
        
          LinkedIn
        </a>
        <br />
        {/* WhatsApp */}
        <a
          href="https://wa.me/+254713082563"
          target="_blank"
          rel="noreferrer"
          className="hover:text-white transition"
        >
          WhatsApp
        </a>
        <br />

        {/* X (Twitter) */}
        <a
          href="https://x.com/meshakh_savvion"
          target="_blank"
          rel="noreferrer"
          className="hover:text-white transition"
        >
          X / Twitter
        </a>
        <br />

       {/* Email */}
        <a
          href="mailto:meshakh@savvion.co.ke"
          className="hover:text-white transition"
        >
          Email
        </a>
      </div>
    </section>
  );
}

/**
 * =========================
 * UI COMPONENTS
 * =========================
 */
function Box({ title, content }) {
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
      <h4 className="text-indigo-400 font-semibold">{title}</h4>
      <p className="text-white/60 text-sm">{content}</p>
    </div>
  );
}

function Case({ title, text }) {
  return (
    <div>
      <h4 className="text-indigo-400 text-sm font-semibold">{title}</h4>
      <p className="text-white/70 text-sm">{text}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
      <p className="text-white/60 text-sm">{label}</p>
      <p className="text-3xl font-bold text-indigo-400">{value}</p>
    </div>
  );
}