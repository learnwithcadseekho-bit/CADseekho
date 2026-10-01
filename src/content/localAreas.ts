// Copy for the Delhi NCR ANSYS landing pages (/ansys-training-*). Each page
// is written for its own area — who studies and works there and what they'd
// use FEA for — rather than one template with the city name swapped, which
// Google treats as doorway pages.
//
// Honesty rules for this file (local SEO depends on trust):
// - No claim of a classroom/office in any city until BUSINESS.address in
//   config/site.ts is set. Classroom batches are described as "ask us".
// - Fees, batch dates and course levels are NOT written here — the page
//   reads them live from the course data.
// - Colleges and industries are named only as context for who the course
//   suits, never as partners or placements.

export type AreaKey = "delhi-ncr" | "delhi" | "noida" | "gurgaon" | "ghaziabad";

export interface AreaFaq {
  question: string;
  answer: string;
}

export interface AreaSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface AreaContent {
  key: AreaKey;
  path: string;
  /** Short place name used in breadcrumbs and links. */
  place: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string[];
  /** Who this page's course suits: students and working engineers in the area. */
  students: AreaSection;
  engineers: AreaSection;
  /** How online vs classroom learning works for someone in this area. */
  modes: AreaSection;
  /** Optional extra, area-specific section. */
  extra?: AreaSection;
  faqs: AreaFaq[];
  /** Other local pages to link to from this one. */
  related: AreaKey[];
}

export const AREA_PATHS: Record<AreaKey, string> = {
  "delhi-ncr": "/ansys-training-delhi-ncr",
  delhi: "/ansys-training-delhi",
  noida: "/ansys-training-noida",
  gurgaon: "/ansys-training-gurgaon",
  ghaziabad: "/ansys-training-ghaziabad",
};

export const AREA_LINK_LABELS: Record<AreaKey, string> = {
  "delhi-ncr": "ANSYS training in Delhi NCR",
  delhi: "ANSYS training in Delhi",
  noida: "ANSYS course in Noida",
  gurgaon: "ANSYS training in Gurugram",
  ghaziabad: "ANSYS training in Ghaziabad",
};

export const AREAS: Record<AreaKey, AreaContent> = {
  "delhi-ncr": {
    key: "delhi-ncr",
    path: AREA_PATHS["delhi-ncr"],
    place: "Delhi NCR",
    title: "ANSYS Training in Delhi NCR – Online & Classroom | CADseekho",
    description:
      "ANSYS Workbench training for Delhi NCR students and engineers. Live online batches, classroom options and a hand-calc-first FEA method. See fees and dates.",
    h1: "ANSYS Training in Delhi NCR",
    eyebrow: "ANSYS Workbench · FEA · Delhi NCR",
    intro: [
      "CADseekho runs ANSYS Workbench and FEA training for students and working engineers across Delhi NCR — Delhi, Noida, Greater Noida, Gurugram, Ghaziabad, Faridabad and Meerut. Classes are live and instructor-led, so you can ask questions while you work, not after a recorded video ends.",
      "What makes the training different is the order we teach things in. Before you trust a stress plot, you should know roughly what number to expect. So we start from the engineering — free-body diagrams, beam and plate formulas, stress concentration factors — and then use ANSYS to confirm, refine and go beyond what a hand calculation can do. The result is an engineer who can defend a simulation in a design review, not just produce a colourful picture.",
    ],
    students: {
      heading: "For engineering students across the NCR",
      paragraphs: [
        "The NCR has one of the densest clusters of engineering colleges in India — from the universities in Delhi to the private and AKTU-affiliated colleges in Noida, Greater Noida and Ghaziabad, and the institutes around Gurugram and Faridabad. Most mechanical, automobile and production students meet FEA in a single elective, if at all, and rarely get to run a full analysis on a real part.",
        "Our ANSYS course gives you that missing practice. You'll take a part from geometry through meshing, loads and supports, solving and reviewing results — the workflow a final-year project, an internship or a first CAE job interview will ask about. Because every model is checked against a hand calculation, you also learn to spot a wrong answer, which is the question interviewers most like to ask.",
      ],
    },
    engineers: {
      heading: "For working engineers in NCR industry",
      paragraphs: [
        "NCR industry is heavily mechanical: passenger-car and two-wheeler plants and their tier-1 and tier-2 suppliers around Gurugram and Manesar, electronics and appliance manufacturing in Noida and Greater Noida, fabrication and light engineering in Ghaziabad, Faridabad and the industrial areas of Delhi. Design engineers in these companies are increasingly expected to check their own parts before a drawing goes to the shop or a sample goes to the customer.",
        "If you design brackets, sheet-metal parts, fixtures, weldments or machine components, ANSYS Workbench lets you answer the questions that come up every week: Will this hold? Where will it crack? Is it over-designed? The course is scheduled so it fits around a working week, and the examples are the kind of parts you already handle.",
      ],
    },
    modes: {
      heading: "Live online batches and classroom options",
      paragraphs: [
        "Most learners across the NCR choose our live online batches. Anyone who has crossed the region at peak hour knows why: a two-hour class should not cost another two hours on the road. Online classes are interactive — you build the model alongside the instructor and clear doubts on the spot. You also get practice part files and PDF notes to keep.",
        "We also run classroom (offline) batches in Delhi NCR for learners who prefer to sit beside the instructor. Venue and dates are confirmed per batch, so message us to ask about the next in-person batch near you.",
      ],
    },
    extra: {
      heading: "ANSYS training near you: pick your area",
      paragraphs: [
        "The course content is the same wherever you join from, but the people in each part of the NCR study and work in different places. These pages explain what the training looks like from where you are:",
      ],
    },
    faqs: [
      {
        question: "Is the ANSYS course in Delhi NCR online or offline?",
        answer:
          "Both options exist. Most batches are live online and instructor-led, which suits learners spread across Delhi, Noida, Gurugram, Ghaziabad, Faridabad and Meerut. Classroom batches are also run in Delhi NCR — contact us for the next in-person batch and its venue.",
      },
      {
        question: "Do I need to know FEA theory before joining?",
        answer:
          "No. The beginner course starts with the ANSYS Workbench workflow and the basic engineering behind it. Comfort with strength of materials from your degree helps, because we compare results with hand calculations, but we revise the formulas we use.",
      },
      {
        question: "What does 'hand calculation first' mean in practice?",
        answer:
          "For a part like a plate with a hole or a loaded beam, you first estimate the stress or deflection with a standard formula, then build the model in ANSYS and compare. If the two disagree, you find out why — mesh, boundary conditions or the formula's assumptions. Our free beam and stress-concentration calculators help with the hand-calc side.",
      },
      {
        question: "Which ANSYS version do you teach?",
        answer:
          "We teach ANSYS Workbench (Mechanical). The workflow — geometry, meshing, loads and supports, solution and post-processing — carries across recent versions, and you can practise on the free ANSYS Student edition.",
      },
      {
        question: "Can working engineers attend on weekdays?",
        answer:
          "Batches are scheduled with working engineers in mind; see the batch schedule on this page and contact us if you need a different time.",
      },
    ],
    related: ["delhi", "noida", "gurgaon", "ghaziabad"],
  },

  delhi: {
    key: "delhi",
    path: AREA_PATHS.delhi,
    place: "Delhi",
    title: "ANSYS & FEA Course in Delhi – Live Batches | CADseekho",
    description:
      "FEA course for Delhi students and engineers: learn ANSYS Workbench live, validate every result with a hand calculation. Online batches across Delhi.",
    h1: "ANSYS & FEA Course in Delhi",
    eyebrow: "ANSYS Workbench · FEA course Delhi",
    intro: [
      "Looking for an FEA course in Delhi that teaches more than which buttons to click? CADseekho's ANSYS Workbench training is live and instructor-led, built around one habit: estimate the answer by hand, then prove it in ANSYS.",
      "Learners join from across the city — North and West Delhi, the colleges in the south and centre, and the industrial belts from Okhla to Bawana — without spending their evening on the Ring Road. If you've been searching for an ANSYS institute in Delhi because you want structured, mentored practice rather than random tutorials, this is what the course looks like.",
    ],
    students: {
      heading: "Delhi engineering students: turn the FEA elective into a real skill",
      paragraphs: [
        "Delhi's universities and the many GGSIPU-affiliated engineering colleges teach finite element theory well, but there is usually little lab time on a commercial solver. Students reach their final-year project, or an internship interview with a design or CAE firm, having never meshed a real part or questioned a result.",
        "The course closes that gap. You'll analyse brackets, plates, shafts and simple assemblies, and for each one you'll compare ANSYS with the formula from your strength-of-materials notes. That comparison is what makes a project report credible and what interviewers probe when they ask, 'How do you know your result is right?'",
      ],
      bullets: [
        "B.Tech / diploma students in mechanical, automobile, production and aerospace branches",
        "M.Tech students who need FEA for a thesis",
        "Graduates preparing for design and CAE interviews",
      ],
    },
    engineers: {
      heading: "Working engineers in Delhi's industrial areas",
      paragraphs: [
        "Delhi still has a large base of small and mid-size manufacturers and job shops — in Okhla, Naraina, Wazirpur, Mayapuri, Narela and Bawana — alongside design consultancies, testing labs and project offices. Engineers here often wear several hats: drafting the part, choosing the material and answering the customer's 'will it hold?' question.",
        "ANSYS Workbench gives you a defensible answer to that question. The course starts with static structural work you can apply immediately — realistic supports, mesh control where stresses peak, reading stress, strain and reaction forces — and goes on to beam and truss models, steady-state thermal, buckling and the basics of design optimisation, finishing with a capstone project.",
      ],
    },
    modes: {
      heading: "Learning from anywhere in Delhi",
      paragraphs: [
        "Live online batches are the default for Delhi learners: a fixed class time, an instructor you can question while you build your model, and practice part files and PDF notes to keep. Weekend classes suit students with college timetables and engineers with shift work.",
        "Prefer a classroom? We run in-person batches in Delhi NCR; the venue and dates are confirmed per batch, so ask us about the next one before you enrol.",
      ],
    },
    faqs: [
      {
        question: "Is there an ANSYS institute near me in Delhi?",
        answer:
          "CADseekho trains Delhi learners mainly through live online batches, so you can join from anywhere in the city without commuting. We also run classroom batches in Delhi NCR — contact us for the next in-person batch and its venue.",
      },
      {
        question: "Is this FEA course useful for GATE or university exams?",
        answer:
          "The course is practical rather than exam coaching, but the hand-calculation comparisons revise strength-of-materials topics — bending, torsion, stress concentration — that appear in exams and interviews.",
      },
      {
        question: "Will I get the ANSYS software?",
        answer:
          "You can practise on the free ANSYS Student edition on your own Windows laptop; check ANSYS's current system requirements before you enrol.",
      },
      {
        question: "Do I need SolidWorks or another CAD tool first?",
        answer:
          "It helps but isn't required. Geometry for the exercises is provided, and simple parts are built inside ANSYS. If you want CAD skills too, we also teach SolidWorks, Creo and AutoCAD.",
      },
    ],
    related: ["delhi-ncr", "noida", "gurgaon", "ghaziabad"],
  },

  noida: {
    key: "noida",
    path: AREA_PATHS.noida,
    place: "Noida",
    title: "ANSYS Course in Noida & Greater Noida – Live | CADseekho",
    description:
      "ANSYS course for Noida and Greater Noida students and engineers. Live Workbench classes, real parts and hand-calc validation. Check fees and dates.",
    h1: "ANSYS Course in Noida & Greater Noida",
    eyebrow: "ANSYS Workbench · Noida · Greater Noida",
    intro: [
      "CADseekho's ANSYS Workbench course is a practical, live FEA programme that Noida and Greater Noida learners join without leaving their sector. You work on real parts alongside the instructor, and every result is checked against a hand calculation before you're asked to trust it.",
      "Noida and Greater Noida combine two things that make ANSYS skills valuable: a large student population in engineering colleges along the Expressway and in Knowledge Park, and a manufacturing base that keeps growing — electronics, appliances, automotive components, sheet metal and plastics.",
    ],
    students: {
      heading: "Students in Noida, Knowledge Park and along the Expressway",
      paragraphs: [
        "The colleges in Noida and Greater Noida — university campuses on the Expressway and the AKTU-affiliated institutes around Knowledge Park — send a large number of mechanical and automobile graduates into the job market every year. Many of them list 'ANSYS' on a CV after a short workshop. Far fewer can explain a mesh convergence study or why a stress plot shows a red hotspot at a sharp corner.",
        "That difference shows in interviews. In this course you will run complete analyses, compare them with formulas, and learn to explain the result in plain engineering language. It's also a strong base for a final-year project: a part analysed in ANSYS and verified by hand reads very differently from a screenshot.",
      ],
      bullets: [
        "Final-year students who want a simulation-based project",
        "Freshers targeting design, CAE or product-development roles in Noida's companies",
        "Diploma holders moving into design work",
      ],
    },
    engineers: {
      heading: "Engineers in Noida's manufacturing and electronics companies",
      paragraphs: [
        "Noida's industrial sectors and Greater Noida's industrial areas host electronics and mobile-phone manufacturing, consumer appliances, automotive and two-wheeler component suppliers, and a long tail of sheet-metal, tooling and plastics vendors. Engineers there design enclosures, mounting brackets, chassis parts, fixtures and packaging that must survive drops, vibration and assembly loads.",
        "ANSYS Workbench helps you check those parts before tooling money is spent. The beginner course covers the static structural workflow you'll use most — materials, meshing, loads and supports, and reading stress, strain and deformation honestly — plus thermal and buckling basics. Sheet-metal and fixture designers find the stress-concentration work especially useful.",
      ],
    },
    modes: {
      heading: "Online from your sector, or a classroom batch",
      paragraphs: [
        "Noida learners mostly choose the live online batches: no Metro change at Botanical Garden, no evening traffic on the Expressway, and no time lost between college or office and class. Classes are interactive — you build each model alongside the instructor and ask questions as you go — and you keep the practice files and PDF notes.",
        "For learners who prefer a classroom, we also run in-person batches in Delhi NCR. Ask us about the next one — we'll share the venue and dates when the batch is confirmed.",
      ],
    },
    faqs: [
      {
        question: "Is there an ANSYS institute near me in Noida?",
        answer:
          "CADseekho teaches Noida and Greater Noida learners through live online batches, so you can join from any sector or campus. Classroom batches also run in Delhi NCR — message us for the next in-person batch and venue.",
      },
      {
        question: "I study at a Greater Noida college. Can I attend around my timetable?",
        answer:
          "Yes. Batch timings are designed for students and working engineers, with weekend-friendly classes. See the schedule on this page or ask us for the next batch.",
      },
      {
        question: "Is the ANSYS course useful for electronics or enclosure design?",
        answer:
          "Yes. Plastic and sheet-metal enclosures, brackets and mounts are exactly the thin, holed parts where stress concentration and support conditions matter, and the course covers both.",
      },
      {
        question: "What laptop do I need?",
        answer:
          "A Windows laptop that can run the free ANSYS Student edition. Check ANSYS's current system requirements; a recent multi-core processor and 8 GB RAM or more make practice much smoother.",
      },
    ],
    related: ["delhi-ncr", "ghaziabad", "delhi", "gurgaon"],
  },

  gurgaon: {
    key: "gurgaon",
    path: AREA_PATHS.gurgaon,
    place: "Gurugram",
    title: "ANSYS Training in Gurugram (Gurgaon) & Manesar | CADseekho",
    description:
      "ANSYS Workbench training for Gurugram and Manesar engineers and students. Live FEA classes on real automotive-style parts, validated by hand calculation.",
    h1: "ANSYS Training in Gurugram (Gurgaon) & Manesar",
    eyebrow: "ANSYS Workbench · Gurugram · Manesar",
    intro: [
      "Gurugram and Manesar form one of India's biggest automotive manufacturing belts, and that makes structural simulation a practical skill rather than an academic one. CADseekho's ANSYS Workbench training is live and instructor-led, built for engineers and students who want to check parts properly — estimate by hand, then validate in ANSYS.",
      "Learners join from Udyog Vihar, Sohna Road, Cyber City, IMT Manesar and beyond, on a schedule that fits around plant shifts and office hours.",
    ],
    students: {
      heading: "Students around Gurugram",
      paragraphs: [
        "Engineering and polytechnic students in and around Gurugram have an advantage many don't use: hundreds of potential employers within an hour's drive. Automotive and component companies here hire graduate engineer trainees for design, quality and testing roles, and FEA is a recurring interview topic.",
        "This course lets you walk into those interviews with real analyses to talk about — a bracket, a shaft, a plate with a hole — each with a hand calculation beside the ANSYS result. You'll be able to explain why the numbers agree, or why they don't, which matters more to an interviewer than a polished screenshot.",
      ],
    },
    engineers: {
      heading: "Engineers in automotive and component companies",
      paragraphs: [
        "The Gurugram–Manesar–Bawal corridor is home to passenger-car and two-wheeler OEMs and a deep supply chain of tier-1 and tier-2 component makers: pressed and fabricated parts, castings and forgings, brackets, fixtures and jigs. Design and process engineers in these companies regularly need to answer 'will it hold?' and 'can we take weight out?' before a part is released.",
        "The ANSYS course focuses on the static structural workflow behind those decisions: realistic supports instead of over-stiff ones, mesh control where stress peaks, and reading results against an engineering calculation — then extends to buckling, thermal and the basics of design optimisation. Engineers in the engineering-services and global capability centres in Cyber City and Golf Course Road use the same workflow on a much wider range of parts.",
      ],
      bullets: [
        "Design and product engineers at OEMs and tier-1/tier-2 suppliers",
        "Tooling, fixture and jig designers in IMT Manesar",
        "Engineers moving from CAD into CAE roles at engineering-services companies",
      ],
    },
    modes: {
      heading: "Fitting training around shifts and NH-48",
      paragraphs: [
        "Anyone who commutes on NH-48 or the Golf Course Extension knows that time is the scarcest resource. That's why most Gurugram and Manesar learners join our live online batches: you build each model alongside the instructor, ask questions as you go, and keep the practice files and notes. Weekend classes suit shift engineers.",
        "We also run classroom batches in Delhi NCR. If you prefer in-person learning, contact us about the next batch and its venue.",
      ],
    },
    faqs: [
      {
        question: "Is there an ANSYS institute near me in Gurgaon or Manesar?",
        answer:
          "Gurugram and Manesar learners join CADseekho's live online batches, which avoids the commute entirely. Classroom batches also run in Delhi NCR — ask us for the next in-person batch and venue.",
      },
      {
        question: "Is the course relevant to automotive component design?",
        answer:
          "Yes. Brackets, mounts, fixtures and pressed parts are typical exercises, and the course emphasises the realistic supports, stress concentrations and result checks that component design needs.",
      },
      {
        question: "Can my company enrol a team?",
        answer:
          "Yes. We run corporate training for engineering teams, built around the kinds of parts your team designs. Contact us with your team size and goals.",
      },
      {
        question: "I work shifts. What if I miss a class?",
        answer:
          "Check the batch schedule on this page and contact us before you enrol if your shifts clash — we'll tell you the options for upcoming batches. You keep the practice files and PDF notes from every class.",
      },
    ],
    related: ["delhi-ncr", "delhi", "noida", "ghaziabad"],
  },

  ghaziabad: {
    key: "ghaziabad",
    path: AREA_PATHS.ghaziabad,
    place: "Ghaziabad",
    title: "ANSYS Training in Ghaziabad – Live FEA Course | CADseekho",
    description:
      "ANSYS Workbench training for Ghaziabad students and engineers: live online FEA classes, real parts and hand-calc validation. Fees and next batch inside.",
    h1: "ANSYS Training in Ghaziabad",
    eyebrow: "ANSYS Workbench · Ghaziabad",
    intro: [
      "Ghaziabad has a large engineering student population and an industrial base that has been building machines, structures and electrical equipment for decades. CADseekho's ANSYS Workbench course brings live, mentored FEA training to both — online, so you can join from Raj Nagar Extension, Indirapuram, Vaishali or Modinagar without a daily trip into Delhi.",
      "Like all our simulation training, it follows one rule: work the problem out by hand first, then use ANSYS to confirm it and go further than the formula can.",
    ],
    students: {
      heading: "Students at Ghaziabad's engineering colleges",
      paragraphs: [
        "The engineering colleges around Ghaziabad — many of them along NH-9 and the Meerut Road — produce a large share of the NCR's mechanical and electrical graduates. Most cover FEA in theory; few students get to analyse a real component from start to finish.",
        "In this course you'll do exactly that: geometry, mesh, loads and supports, solution and results, then a check against the formula from your notes. It's the practical evidence a project report and an interview both need, and it's a step beyond the one-day software workshops many students have already attended.",
      ],
    },
    engineers: {
      heading: "Engineers in fabrication, castings and machine building",
      paragraphs: [
        "Ghaziabad's industrial areas — Sahibabad, Meerut Road, Loni and Kavi Nagar among them — are home to structural fabricators, foundries, machine builders and electrical-equipment manufacturers. Engineers here design frames, base plates, lifting lugs, brackets and housings, often under pressure to cut weight or cost without risking a failure.",
        "ANSYS Workbench is the tool for checking those decisions. The course concentrates on static structural analysis of the parts you actually make: plates with holes and cut-outs, welded frames simplified sensibly, and results you can explain to a customer or an auditor because they agree with a hand calculation.",
      ],
      bullets: [
        "Design engineers in fabrication and structural companies",
        "Engineers in castings, forgings and machine-building firms",
        "Electrical-equipment designers who need to check enclosures and mounts",
      ],
    },
    modes: {
      heading: "Join live from Ghaziabad",
      paragraphs: [
        "Most Ghaziabad learners join our live online batches. Classes are interactive — questions answered as you build the model — and you keep the practice files and notes. With the new rapid-rail and Metro links, a classroom batch in the NCR is also more reachable than it used to be.",
        "We run classroom batches in Delhi NCR; contact us to ask about the next in-person batch and its venue.",
      ],
    },
    faqs: [
      {
        question: "Is there an ANSYS institute near me in Ghaziabad?",
        answer:
          "CADseekho trains Ghaziabad learners through live online batches, so there's no commute. We also run classroom batches in Delhi NCR — message us for the next in-person batch and its venue.",
      },
      {
        question: "I'm from Meerut. Can I join?",
        answer:
          "Yes. The live online batches are open to learners anywhere in the NCR, including Meerut, Modinagar and Hapur.",
      },
      {
        question: "Does the course cover welded structures?",
        answer:
          "The beginner course covers static structural analysis, beam and truss models and buckling — the foundations for analysing frames and fabricated parts. Detailed weld modelling isn't a Level 1 topic.",
      },
      {
        question: "What will I be able to do after the course?",
        answer:
          "Set up and solve static structural, beam and truss, steady-state thermal and buckling analyses in ANSYS Workbench, control the mesh, check results against engineering calculations, and explain what the plots mean — finishing with an end-to-end capstone project.",
      },
    ],
    related: ["delhi-ncr", "noida", "delhi", "gurgaon"],
  },
};

/** Shared across pages: the method, kept short so each page stays mostly unique. */
export const METHOD_STEPS = [
  {
    title: "1 · Estimate by hand",
    body: "Free-body diagram, the right formula and a quick number — so you know what a sensible answer looks like before you open ANSYS.",
  },
  {
    title: "2 · Model in ANSYS Workbench",
    body: "Geometry, mesh, materials, loads and supports set up the way an experienced analyst would, not the way the defaults suggest.",
  },
  {
    title: "3 · Compare and explain",
    body: "Check the ANSYS result against your estimate. Agreement builds confidence; disagreement teaches you about meshes, constraints and assumptions.",
  },
];
