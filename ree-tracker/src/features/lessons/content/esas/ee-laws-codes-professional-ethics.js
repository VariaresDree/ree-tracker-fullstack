// Library › Lessons › ESAS › EE Laws, Codes, & Professional Ethics
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// lawsLesson.test.js. Coverage cross-checked against a review center's PEC,
// standard practices and EE laws handout; the text, problems and figures are
// this app's own): written for the Philippine REE board, subtopic by subtopic
// in the syllabus's order. It explains what each law does and why; for exact
// section wording, fines and the latest IRR amendments, read the law itself.
// The Philippine Electrical Code's own rules are in Electrical Standards and
// Practices.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// REE exam weights and the general average.
export const WEIGHTS = { math: 0.25, esas: 0.3, ee: 0.45 };
export const generalAverage = (math, esas, ee) => WEIGHTS.math * math + WEIGHTS.esas * esas + WEIGHTS.ee * ee;

// An illustrative house with a 10 kW rooftop array: solar output and load (kW) against the hour.
export const solarKw = (h) => 10 * Math.exp(-(((h - 12) / 2.6) ** 2));
export const loadKw = (h) => 1.2 + 3.2 * Math.exp(-(((h - 20) / 1.8) ** 2)) + 1.4 * Math.exp(-(((h - 7) / 1.2) ** 2));

export default {
  topic: 'EE Laws, Codes, & Professional Ethics',
  subject: 'ESAS',
  overview: r`An electrical engineer's practice is shaped by law: RA 7920 says who may practise and how they are licensed, the Philippine Electrical Code says how installations are built, the energy laws (EPIRA, Renewable Energy, Energy Efficiency) shape the power industry, and the Civil Code governs the contracts engineers sign. The code of ethics adds what the law can't: honesty, competence, and putting public safety first. Board items ask which law does what, what each professional title allows, and how an ethical engineer acts in a given situation.`,
  sources: [
    'Republic Act 7920 (New Electrical Engineering Law) and its IRR',
    'RA 9136 (EPIRA), RA 9513 (Renewable Energy Act), RA 11285 (Energy Efficiency and Conservation Act), RA 10912 (CPD Act)',
    'Civil Code of the Philippines, Book IV (Obligations and Contracts)',
    'IIEE Code of Ethics; Philippine Grid Code and Philippine Distribution Code',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'RA 7920 New Electrical Engineering Law',
      inShort: r`The 1995 law that regulates the practice of electrical engineering.`,
      body: [
        r`**RA 7920**, approved on February 24, 1995, is the New Electrical Engineering Law. It replaced **RA 184** of 1947 and governs the examination, registration and practice of electrical engineering: it creates the Board of Electrical Engineering, sets the licensure exams, defines the three titles and what each may do, and penalises practice without a license.`,
        r`Other laws an electrical engineer meets, in order:

| Law | Year | What it does |
|---|---|---|
| RA 184 | 1947 | the old Electrical Engineering Law |
| RA 7832 | 1994 | penalises pilferage of electricity and theft of power lines and materials |
| RA 7920 | 1995 | the New Electrical Engineering Law |
| RA 8981 | 2000 | PRC Modernization Act |
| RA 9136 (EPIRA) | 2001 | restructured the power industry |
| RA 9513 | 2008 | Renewable Energy Act |
| RA 10912 | 2016 | Continuing Professional Development Act |
| RA 10968 | 2018 | Philippine Qualifications Framework |
| RA 11285 | 2019 | Energy Efficiency and Conservation Act |
| RA 11361 | 2019 | Anti-Obstruction of Power Lines Act |
| RA 11371 | 2019 | Murang Kuryente Act (Malampaya funds against stranded costs) |`,
      ],
      keyIdeas: [
        r`RA 7920 (1995) replaced RA 184 and covers the examination, registration and practice of electrical engineering.`,
        r`It recognizes three titles: Professional Electrical Engineer (PEE), Registered Electrical Engineer (REE) and Registered Master Electrician (RME).`,
        r`It creates the Board of Electrical Engineering under the PRC, and requires a license (and seal) to practise.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An unlicensed signatory',
          problem: r`A company hires an unlicensed graduate to sign electrical plans as the engineer of record. What does RA 7920 say?`,
          steps: [
            r`Practising, or holding oneself out as an electrical engineer, without a valid registration is prohibited and punishable.`,
            r`Plans must be signed and sealed by a duly licensed engineer within the scope of their title.`,
          ],
          answer: r`Not allowed: only a licensed engineer within their scope may sign and seal.`,
        },
        {
          level: 'board',
          title: 'Which law?',
          problem: r`Name the law for each: (a) a man tapping a line to bypass his meter; (b) a billboard built under a transmission line; (c) using Malampaya gas revenue to pay the power sector's stranded debts.`,
          steps: [
            r`(a) Pilferage of electricity: RA 7832.`,
            r`(b) Obstructing a power line's corridor: RA 11361.`,
            r`(c) RA 11371, the Murang Kuryente Act.`,
          ],
          answer: r`RA 7832; RA 11361; RA 11371.`,
        },
      ],
      traps: [
        r`Graduating in electrical engineering is not a license to practise: passing the board and registering are.`,
        r`RA 184 is the OLD law (1947); RA 7920 replaced it.`,
      ],
      check: [
        { q: r`When was RA 7920 approved?`, a: r`February 24, 1995.` },
        { q: r`What is RA 7832 about?`, a: r`Pilferage of electricity and theft of power transmission lines and materials.` },
      ],
    },
    {
      name: 'Implementing Rules and Regulations',
      inShort: r`The rules that put RA 7920 into practice.`,
      body: [
        r`A law states principles; its **Implementing Rules and Regulations** (IRR) say how they work in practice. The IRR of RA 7920 was issued as Board Resolution No. 18, series of 1995, and the Board adds resolutions as needed: exam coverage, registration, seals, and discipline. Rules have the force of law, but only within the limits of the act they implement.`,
        r`The Board's powers come in three kinds:

| Power | Means | Example |
|---|---|---|
| Quasi-legislative | rule-making | issuing the IRR and the Code of Ethics |
| Quasi-judicial | hearing and deciding cases | suspending or revoking a certificate after a hearing |
| Administrative | running the regulation | conducting exams, registering, keeping the roster |`,
        r`Rules and the **Code of Ethics** take effect after approval by the Commission and **fifteen days after publication** in the Official Gazette (or a newspaper of general circulation).`,
      ],
      keyIdeas: [
        r`The Board, with the PRC, issues the IRR and resolutions: exam coverage, registration, seals, discipline.`,
        r`Rules have the force of law within the limits of the act; quasi-legislative power is rule-making.`,
        r`Board resolutions are published before taking effect: fifteen days after publication.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Where are the rules?',
          problem: r`Where would you find the detailed syllabus of the REE board exam and the rules on the professional seal?`,
          steps: [r`In the IRR and the Board of Electrical Engineering's resolutions issued under RA 7920, published by the PRC.`],
          answer: r`The IRR and Board resolutions under RA 7920.`,
        },
        {
          level: 'board',
          title: 'Which power?',
          problem: r`Classify: (a) the Board issues a resolution setting the seal's design; (b) it hears a complaint and suspends an engineer's certificate; (c) it gives the licensure exam.`,
          steps: [
            r`(a) Making rules: quasi-legislative.`,
            r`(b) Deciding a case after due process: quasi-judicial.`,
            r`(c) Running the regulation: administrative.`,
          ],
          answer: r`Quasi-legislative; quasi-judicial; administrative.`,
        },
      ],
      traps: [
        r`An IRR can't go beyond the law it implements.`,
        r`Quasi-legislative means rule-making, not judging.`,
      ],
      check: [
        { q: r`What resolution issued the IRR of RA 7920?`, a: r`Board Resolution No. 18, series of 1995.` },
        { q: r`How long after publication does the Code of Ethics take effect?`, a: r`Fifteen days.` },
      ],
    },
    {
      name: 'Board and Licensure',
      inShort: r`The Board of Electrical Engineering, the licensure exams and registration.`,
      body: [
        r`The **Board of Electrical Engineering** (BEE), under the PRC, has a chairman and two members, all Professional Electrical Engineers. It prepares and gives the licensure exams, registers successful examinees, and disciplines licensees.`,
        r`The REE exam has three subjects, weighted Mathematics 25%, ESAS 30% and EE 45%. To pass, a candidate needs a **general average of 70%** with **no subject below 50%**. With Mathematics 65 and ESAS 70, the EE score decides it:`,
        {
          type: 'plot',
          alt: 'General average against the EE score from 40 to 100, with Mathematics 65 and ESAS 70: a straight line rising 0.45 points per point of EE, crossing the 70 percent pass line at an EE score of about 72.8.',
          caption: 'Mathematics 65 and ESAS 70: the general average reaches the 70% pass line at an EE score of about 72.8.',
          x: [40, 100],
          y: [50, 85],
          xLabel: 'EE score',
          yLabel: 'general average',
          series: [{ f: (ee) => generalAverage(65, 70, ee), label: 'average' }],
          marks: [{ y: 70, label: '70%' }, { x: (70 - generalAverage(65, 70, 0)) / WEIGHTS.ee, label: '72.8' }],
        },
        r`A **Registered Electrical Engineer** passes the written exam. A **Professional Electrical Engineer** is the higher title, earned on credentials (years of documented practice as an REE and an evaluation) rather than another written exam. The Board may suspend or revoke a certificate for unprofessional or dishonest conduct, always after due process.`,
      ],
      keyIdeas: [
        r`The Board has a chairman and two members, appointed from Professional Electrical Engineers.`,
        r`REE exam: Mathematics 25%, ESAS 30%, EE 45%; pass with a 70% general average and no subject below 50%.`,
        r`PEE is earned by credentials (an REE's experience and record), not a written exam. The Board may suspend or revoke a certificate for cause, after due process.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Pass or fail?',
          problem: r`A candidate scores Mathematics 65, ESAS 70 and EE 74. Pass or fail?`,
          steps: [
            r`$0.25 \times 65 + 0.30 \times 70 + 0.45 \times 74 = 70.55\%$.`,
            r`No subject is below 50: pass.`,
          ],
          answer: r`Pass, 70.55%.`,
        },
        {
          level: 'board',
          title: 'A high average that fails',
          problem: r`Another candidate scores Mathematics 45, ESAS 85 and EE 80. Find the general average. Pass or fail? What EE score would the first candidate have needed, at least?`,
          steps: [
            r`$0.25 \times 45 + 0.30 \times 85 + 0.45 \times 80 = 72.75\%$, above 70.`,
            r`But Mathematics is below 50: fail.`,
            r`First candidate: $0.45x = 70 - 16.25 - 21 = 32.75$, so $x = 72.8$.`,
          ],
          answer: r`72.75%, but fails (Mathematics below 50); EE at least 72.8.`,
        },
      ],
      traps: [
        r`A subject below 50% fails the exam even if the general average is above 70%.`,
        r`Weight each subject before averaging: a plain mean of the three is wrong.`,
      ],
      check: [
        { q: r`How many members, with the chairman, make up the Board?`, a: r`Three: a chairman and two members.` },
        { q: r`What are the REE exam's subject weights?`, a: r`Mathematics 25%, ESAS 30%, EE 45%.` },
      ],
    },
    {
      name: 'Scope of Practice',
      inShort: r`What each title may do.`,
      body: [
        r`RA 7920 defines the practice of electrical engineering broadly: consultation, design and planning, supervision of installation and operation, valuation and management of electrical systems and plants, and teaching professional electrical subjects. The three titles split it:

| Title | May do |
|---|---|
| Professional Electrical Engineer (PEE) | everything, including consultancy and signing and sealing designs and plans of any capacity |
| Registered Electrical Engineer (REE) | design, installation, operation and supervision of electrical systems within the limits the law sets |
| Registered Master Electrician (RME) | installation, wiring, operation and maintenance within the power and voltage limits the law sets |`,
        r`**Electrical system design** means choosing the systems and planning and detailing their protection, control, monitoring, coordination and interlocking. A **foreigner** may practise here only under **reciprocity** (their country allows Filipinos to practise there) or a special permit for a specific project.`,
      ],
      keyIdeas: [
        r`PEE: the widest scope, including consultancy and signing and sealing designs and plans.`,
        r`REE: design, installation, operation and supervision of electrical systems within the law's limits.`,
        r`RME: installation, wiring, operation and maintenance of systems within the limits of power and voltage the law sets.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An RME and a substation',
          problem: r`An RME is asked to sign the design of a large industrial plant's substation. Should they?`,
          steps: [
            r`No: that is beyond a master electrician's scope.`,
            r`It needs an engineer whose title covers it (in practice a PEE), and accepting it would also breach the code of ethics.`,
          ],
          answer: r`No: beyond an RME's scope.`,
        },
        {
          level: 'board',
          title: 'A foreign consultant',
          problem: r`A foreign electrical engineer is hired to design a plant in the Philippines. Under what condition may they practise?`,
          steps: [
            r`Only under reciprocity: their country must allow Filipino engineers to practise there on the same terms.`,
            r`Or under a special temporary permit for that project, as the law and PRC rules allow.`,
          ],
          answer: r`Foreign reciprocity, or a special temporary permit.`,
        },
      ],
      traps: [
        r`Working beyond your title's scope is both illegal and unethical, even if you are capable.`,
        r`Teaching professional electrical subjects is part of the practice too.`,
      ],
      check: [
        { q: r`Which title may sign and seal plans of any capacity?`, a: r`Professional Electrical Engineer.` },
        { q: r`What lets a foreign engineer practise here?`, a: r`Reciprocity (or a special temporary permit).` },
      ],
    },
    {
      name: 'Code of Ethics',
      inShort: r`How a professional electrical engineer behaves: to the public, clients, employers and colleagues.`,
      body: [
        r`The Code of Ethics for Electrical Engineers (Board Resolution No. 22, series of 1995) rests on honesty, fairness and justice, and puts the public first. It has three articles of duties:

| Article | Covers | Some of its duties |
|---|---|---|
| I, Professional Life | the engineer and the public | fidelity to clients with an optimum margin of safety; uphold the profession's honour; keep learning; advertise only simply; protect life and health |
| II, Relation with Client and Employer | the engineer's work | fairness; disclose financial interests and conflicts; warn of dangers; no pay from more than one party for the same work without consent; keep confidences; don't write specifications to suit one bidder |
| III, Relation with Fellow Engineers | the profession | give credit where due; don't underbid after public bidding results are out; don't alter another engineer's signed plans without written consent; don't malign others |`,
        r`When duties clash, **public safety, health and welfare** come first: before the client, the employer and the engineer's own interest.`,
      ],
      keyIdeas: [
        r`Public safety, health and welfare come first.`,
        r`Practise only within your competence; be honest in reports, bids and statements; disclose conflicts of interest.`,
        r`Don't supplant another engineer, take secret commissions, or criticize colleagues unfairly; keep client information confidential.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A client who wants to cut corners',
          problem: r`A client asks you to approve an installation you know violates the PEC to save money. What do you do?`,
          steps: [
            r`Refuse, explain the hazard and the code requirement in writing, and propose a compliant solution.`,
            r`Public safety outranks the client's wishes; if they proceed anyway, you may have to report it.`,
          ],
          answer: r`Refuse, explain in writing, offer a compliant fix.`,
        },
        {
          level: 'board',
          title: 'Three situations',
          problem: r`Is each ethical? (a) You change another PEE's signed and sealed plan to fit a new layout without asking. (b) You write a specification that only your relative's product can meet. (c) After a public bid's results are announced, you offer the client a lower price than the winner's.`,
          steps: [
            r`(a) No: altering another engineer's signed plans needs their written consent (Article III).`,
            r`(b) No: a conflict of interest, and specifications must not be written to favour one bidder (Article II).`,
            r`(c) No: underbidding after the results of a public bidding are out (Article III).`,
          ],
          answer: r`None of them.`,
        },
      ],
      traps: [
        r`Loyalty to an employer never extends to hiding a safety hazard.`,
        r`Ethics is not law alone: something legal can still be unethical.`,
      ],
      check: [
        { q: r`Which board resolution is the Code of Ethics?`, a: r`Board Resolution No. 22, series of 1995.` },
        { q: r`Which article covers relations with fellow engineers?`, a: r`Article III.` },
      ],
    },
    {
      name: 'Obligations and Contracts',
      inShort: r`The Civil Code rules behind every engineering contract.`,
      body: [
        r`An **obligation** is a legal necessity to give, to do, or not to do. It needs an active subject (the creditor), a passive subject (the debtor), an object (the prestation) and a legal tie. Obligations arise from five sources (Art. 1157): **law**, **contracts**, **quasi-contracts** (such as returning a payment made by mistake), **delicts** (crimes) and **quasi-delicts** (negligence). They are extinguished by payment, loss of the thing due, condonation, confusion (creditor and debtor become one), compensation (set-off) and novation.`,
        r`A **contract** is a meeting of minds; it is valid with **consent, object and cause** (Art. 1318), and binds the parties like law (Art. 1159). Consent must be intelligent, free and spontaneous: not given by a minor or an insane person, nor by force, intimidation, fraud, undue influence or mistake. Flawed contracts fall into four kinds:

| Kind | Status | Example |
|---|---|---|
| Rescissible | valid, but can be set aside for damage | lesion of more than one-fourth of the value |
| Voidable | valid until annulled | consent by mistake, fraud, force or intimidation |
| Unenforceable | can't be sued on until ratified | made without authority; not in writing when the Statute of Frauds requires |
| Void | no effect at all | illegal object or cause; outside the commerce of men |`,
        r`Actions don't last forever: they **prescribe** in 10 years on a written contract, 6 on an oral one, and 4 for a quasi-delict.`,
      ],
      keyIdeas: [
        r`Obligations arise from law, contracts, quasi-contracts, delicts and quasi-delicts (Art. 1157).`,
        r`A contract needs consent, object and cause (Art. 1318), and is law between the parties (Art. 1159).`,
        r`Defective contracts: rescissible, voidable, unenforceable, void. Actions prescribe in 10 years (written), 6 (oral), 4 (quasi-delict).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Is it too late to sue?',
          problem: r`A contractor breached a written supply contract three years ago. Can the owner still sue? What if the claim were for negligence causing injury, five years ago?`,
          steps: [
            r`Written contracts prescribe in 10 years: 3 years is within it, so yes.`,
            r`The negligence (quasi-delict) claim prescribes in 4 years: 5 years have passed, so it has prescribed.`,
          ],
          answer: r`Yes; no.`,
        },
        {
          level: 'board',
          title: 'Classifying contracts',
          problem: r`Classify: (a) a supplier signs under threat of violence; (b) a contract to sell a public plaza; (c) a sale that leaves a ward's estate short by 30% of the thing's value.`,
          steps: [
            r`(a) Consent vitiated by intimidation: voidable.`,
            r`(b) A public plaza is outside the commerce of men: void.`,
            r`(c) Lesion of more than one-fourth (30% > 25%): rescissible.`,
          ],
          answer: r`Voidable; void; rescissible.`,
        },
      ],
      traps: [
        r`A void contract produces no effect and can't be ratified; a voidable one is valid until annulled.`,
        r`Force majeure (a typhoon, an earthquake) generally excuses delay; negligence doesn't.`,
      ],
      check: [
        { q: r`What are the three essential elements of a contract?`, a: r`Consent, object and cause.` },
        { q: r`What is the prescriptive period for an action on an oral contract?`, a: r`Six years.` },
      ],
    },
    {
      name: 'RA 9136 EPIRA',
      inShort: r`The Electric Power Industry Reform Act of 2001, which restructured the power industry.`,
      body: [
        r`Before 2001 the government's National Power Corporation built most plants and ran the grid. **EPIRA** split the industry by function, opened generation to competition, and left the wires as regulated monopolies:`,
        {
          type: 'blocks',
          alt: 'The power industry after EPIRA: generating companies sell into the wholesale spot market and deliver power over the NGCP transmission grid to distribution utilities and electric cooperatives, which supply customers.',
          caption: 'After EPIRA: competitive generators trade on WESM; the grid and distribution stay regulated.',
          blocks: [
            { id: 'gen', at: [0, 0], label: 'Gencos' },
            { id: 'wesm', at: [2, 0], label: 'WESM' },
            { id: 'grid', at: [0, 1], label: 'NGCP grid' },
            { id: 'du', at: [0, 2], label: 'DUs, ECs' },
            { id: 'users', at: [0, 3], label: 'Customers' },
          ],
          links: [
            ['gen', 'wesm', { label: 'sell' }],
            ['gen', 'grid', { label: 'transmission' }],
            ['grid', 'du', { label: 'distribution' }],
            ['du', 'users', { label: 'supply' }],
          ],
        },
        r`| Body | Role |
|---|---|
| DOE | energy policy and planning |
| ERC (Energy Regulatory Commission) | regulates rates; enforces the Grid and Distribution Codes |
| PSALM (Power Sector Assets and Liabilities Management Corporation) | sold off NPC's plants and manages its debts |
| TransCo / NGCP | owns / operates the transmission grid (NGCP under concession) |
| WESM (Wholesale Electricity Spot Market) | where generators and buyers trade power |
| NPC-SPUG (Small Power Utilities Group) | missionary electrification of off-grid areas |`,
        r`Under **open access** and **retail competition**, large users (the **contestable market**) may choose their supplier; the rest (the **captive market**) buy from their distribution utility.`,
      ],
      keyIdeas: [
        r`Separated the industry into generation (competitive), transmission and distribution (regulated) and supply.`,
        r`Created the Energy Regulatory Commission (ERC), PSALM (to privatize NPC's assets) and the Wholesale Electricity Spot Market (WESM).`,
        r`Transmission went to TransCo, now operated by NGCP under a concession; open access and retail competition let large users choose their supplier.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Who regulates, who sold?',
          problem: r`Which body sets distribution rates and enforces the Grid and Distribution Codes, and which one sold off NPC's power plants?`,
          steps: [r`The ERC regulates rates and enforces the codes; PSALM privatized NPC's generation assets.`],
          answer: r`ERC; PSALM.`,
        },
        {
          level: 'board',
          title: 'Captive or contestable?',
          problem: r`A household and a large factory are both on the same distribution utility. Which can choose its supplier under retail competition, and what are the two groups called?`,
          steps: [
            r`The large factory, if it meets the ERC's demand threshold: the contestable market.`,
            r`The household must buy from its utility: the captive market.`,
          ],
          answer: r`The factory (contestable); the household is captive.`,
        },
      ],
      traps: [
        r`The DOE makes energy policy; the ERC regulates. Don't swap them.`,
        r`PSALM is a CORPORATION: Power Sector Assets and Liabilities Management Corporation.`,
      ],
      check: [
        { q: r`What does WESM stand for?`, a: r`Wholesale Electricity Spot Market.` },
        { q: r`What NPC unit electrifies off-grid areas?`, a: r`SPUG, the Small Power Utilities Group.` },
      ],
    },
    {
      name: 'RA 9513 Renewable Energy',
      inShort: r`The Renewable Energy Act of 2008, which promotes power from renewable sources.`,
      body: [
        r`The **Renewable Energy Act** promotes solar, wind, hydro, geothermal, biomass and ocean energy with fiscal incentives (an income-tax holiday, duty-free imports of equipment) and market tools: **Renewable Portfolio Standards** (suppliers must source a rising share from renewables), **feed-in tariffs**, and the **Green Energy Option** (customers may choose renewable supply).`,
        r`**Net metering** lets a customer with a renewable system of up to 100 kW export its surplus to the distribution utility and be credited for it. On a sunny day a rooftop array runs ahead of the house at midday and behind it at night:`,
        {
          type: 'plot',
          alt: 'An illustrative day for a house with a 10 kilowatt rooftop solar array: solar output, shaded, rises from near zero at dawn to 10 kilowatts at noon and falls by dusk; the house load, dashed, has a small morning peak and a larger evening peak near 4.4 kilowatts. Around midday the solar exceeds the load and the surplus is exported.',
          caption: 'An illustrative day: solar (shaded) runs ahead of the load (dashed) at midday, and the surplus is exported under net metering.',
          x: [0, 24],
          y: [0, 11],
          xLabel: 'hour',
          yLabel: 'kW',
          series: [
            { f: solarKw, label: 'solar', area: true },
            { f: loadKw, label: 'load', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Incentives for RE developers, such as an income-tax holiday and duty-free imports.`,
        r`Market tools: Renewable Portfolio Standards, feed-in tariffs, the Green Energy Option.`,
        r`Net metering for customers' own RE systems up to 100 kW.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Selling the surplus',
          problem: r`A homeowner installs a 10 kW rooftop solar system. What lets them sell their surplus to the distribution utility?`,
          steps: [r`Net metering under RA 9513: systems up to 100 kW export surplus energy and are credited on their bill.`],
          answer: r`Net metering (RA 9513).`,
        },
        {
          level: 'board',
          title: 'A net-metered bill',
          problem: r`In a month a net-metered home imports 450 kWh at ₱11.00/kWh and exports 300 kWh, credited at the utility's blended generation cost of ₱6.00/kWh. Find the energy part of its bill.`,
          steps: [
            r`Imports: $450 \times 11 = ₱4950$.`,
            r`Export credit: $300 \times 6 = ₱1800$.`,
            r`Bill $4950 - 1800 = ₱3150$.`,
          ],
          answer: r`₱3150.`,
        },
      ],
      traps: [
        r`Net-metering credit is at the utility's blended generation cost, not the full retail rate.`,
        r`Net metering is capped at 100 kW per customer.`,
      ],
      check: [
        { q: r`What is the size limit for net metering?`, a: r`100 kW.` },
        { q: r`What lets customers choose renewable energy for their supply?`, a: r`The Green Energy Option.` },
      ],
    },
    {
      name: 'RA 11285 Energy Efficiency',
      inShort: r`The Energy Efficiency and Conservation Act of 2019.`,
      body: [
        r`The **Energy Efficiency and Conservation Act** (approved April 12, 2019) makes energy efficiency national policy under the DOE. Large energy users, the **designated establishments**, must keep energy records and report their consumption, set efficiency targets and plans, undergo energy audits, and appoint certified **energy conservation officers** or **energy managers**. Appliances, vehicles and buildings get **minimum energy performance standards** and **energy labels**.`,
        r`Its savings are measured the simple way: power saved × hours × the price of energy, against what the change costs.`,
      ],
      keyIdeas: [
        r`Makes energy efficiency a national policy, led by the DOE.`,
        r`Designated establishments (large energy users) must keep energy records, report consumption, and appoint energy conservation officers or managers.`,
        r`Minimum energy performance standards and energy labels for appliances, vehicles and buildings.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A designated establishment',
          problem: r`A large factory is classed as a designated establishment. Name two things the law requires of it.`,
          steps: [r`Appoint a certified energy conservation officer or manager, and keep and report its energy consumption (with energy audits and efficiency plans).`],
          answer: r`An energy officer or manager; energy records and reports.`,
        },
        {
          level: 'board',
          title: 'A lighting retrofit',
          problem: r`An office replaces 100 lamps of 40 W with LED lamps of 18 W. They burn 12 hours a day, 300 days a year, at ₱10/kWh. The LEDs cost ₱300 each installed. Find the yearly saving and the simple payback.`,
          steps: [
            r`Power saved $100 \times 22 = 2200$ W; hours $12 \times 300 = 3600$.`,
            r`Energy saved $2.2 \times 3600 = 7920$ kWh, worth ₱79,200 a year.`,
            r`Payback $\frac{30\,000}{79\,200} = 0.38$ years, about 4.5 months.`,
          ],
          answer: r`₱79,200 a year; about 4.5 months.`,
        },
      ],
      traps: [
        r`Energy efficiency (RA 11285) and renewable energy (RA 9513) are different laws.`,
        r`Save energy (kWh), not just power: multiply by the hours.`,
      ],
      check: [
        { q: r`What does RA 11285 call large energy users?`, a: r`Designated establishments.` },
        { q: r`Which agency leads energy efficiency under RA 11285?`, a: r`The Department of Energy.` },
      ],
    },
    {
      name: 'RA 10912 CPD',
      inShort: r`The Continuing Professional Development Act of 2016.`,
      body: [
        r`The **CPD Act** requires licensed professionals to keep their competence up after the board exam. Each profession has a **CPD Council** under its Professional Regulatory Board; accredited programs (seminars, courses, self-directed learning, professional work, postgraduate study) earn CPD units, which count toward renewing the professional license.`,
        r`It sits alongside the **Philippine Qualifications Framework** (RA 10968, 2018), which levels qualifications from basic education to doctorates so they can be compared at home and abroad, including with ASEAN partners.`,
      ],
      keyIdeas: [
        r`Requires licensed professionals to keep learning after the board exam.`,
        r`CPD units from accredited programs count toward renewing the license.`,
        r`Each profession has a CPD Council under the PRC; RA 10968 sets the Philippine Qualifications Framework.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Why CPD units?',
          problem: r`Why does an REE need CPD units?`,
          steps: [r`Under RA 10912, CPD is part of renewing the professional license, to keep practitioners' knowledge current.`],
          answer: r`To renew the license (RA 10912).`,
        },
        {
          level: 'board',
          title: 'Which counts?',
          problem: r`Which of these could earn CPD credit for an electrical engineer, if accredited: a protection-coordination seminar, a master's degree in power systems, presenting a paper at an IIEE convention?`,
          steps: [
            r`All three are kinds of CPD activity: formal learning, postgraduate study, and professional contribution.`,
            r`Each counts once accredited by the CPD Council.`,
          ],
          answer: r`All three, once accredited.`,
        },
      ],
      traps: [
        r`Check the PRC's current CPD rules: the required units have been revised since 2016.`,
        r`The PQF (RA 10968) levels qualifications; the CPD Act (RA 10912) keeps licensees learning.`,
      ],
      check: [
        { q: r`What law is the Continuing Professional Development Act?`, a: r`RA 10912 (2016).` },
        { q: r`What law set up the Philippine Qualifications Framework?`, a: r`RA 10968 (2018).` },
      ],
    },
    {
      name: 'Grid and Distribution Codes',
      inShort: r`The technical rules for connecting to and operating the grid and distribution systems.`,
      body: [
        r`The **Philippine Grid Code** (ERC Resolution No. 22, series of 2016) and the **Philippine Distribution Code** set the technical rules for the networks: performance standards (frequency, voltage, harmonics, flicker, reliability), connection requirements, planning, operations and protection. They bind the grid operator, generators, distribution utilities and large users connected to them, and the ERC enforces them. The Distribution Code also sets a **supplier of last resort** for customers whose supplier fails.`,
        r`Distribution reliability is scored by interruption indices, over all the customers served:

| Index | Measures | Formula |
|---|---|---|
| SAIFI | how OFTEN the average customer is interrupted | $\frac{\text{customer interruptions}}{\text{customers served}}$ |
| SAIDI | how LONG, in total, the average customer is out | $\frac{\text{customer-hours of interruption}}{\text{customers served}}$ |
| CAIDI | how long each interruption lasts | $\frac{\text{SAIDI}}{\text{SAIFI}}$ |`,
        r`The **Philippine Electrical Code** governs installations inside premises; these codes govern the networks that feed them.`,
      ],
      keyIdeas: [
        r`The Philippine Grid Code (latest 2016) and Distribution Code (2017) are issued and enforced by the ERC.`,
        r`They set performance standards (frequency around 60 Hz, voltage, harmonics, flicker), connection requirements, planning and operations.`,
        r`They apply to the grid operator, generators, distribution utilities and large users connected to them.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A solar farm on the grid',
          problem: r`A developer wants to connect a new solar farm to the transmission grid. Which code sets its technical requirements?`,
          steps: [r`The Philippine Grid Code: connection, protection, power quality and operating requirements, coordinated with NGCP as the system operator.`],
          answer: r`The Philippine Grid Code.`,
        },
        {
          level: 'board',
          title: 'Reliability indices',
          problem: r`A utility serves 5000 customers. In a year: 1000 customers lose power for 2 h, 2000 for 0.5 h, and 500 for 4 h. Find SAIFI, SAIDI and CAIDI.`,
          steps: [
            r`Customer interruptions $1000 + 2000 + 500 = 3500$: SAIFI $= \frac{3500}{5000} = 0.7$ a year.`,
            r`Customer-hours $2000 + 1000 + 2000 = 5000$: SAIDI $= \frac{5000}{5000} = 1.0$ h a year.`,
            r`CAIDI $= \frac{1.0}{0.7} = 1.43$ h per interruption.`,
          ],
          answer: r`SAIFI 0.7; SAIDI 1.0 h; CAIDI 1.43 h.`,
        },
      ],
      traps: [
        r`The PEC governs installations inside premises; the Grid and Distribution Codes govern the networks.`,
        r`SAIDI counts total DURATION per customer served; SAIFI counts how many times.`,
      ],
      check: [
        { q: r`Which body enforces the Grid and Distribution Codes?`, a: r`The Energy Regulatory Commission.` },
        { q: r`Which index gives total interruption duration per customer served?`, a: r`SAIDI.` },
      ],
    },
  ],
};
