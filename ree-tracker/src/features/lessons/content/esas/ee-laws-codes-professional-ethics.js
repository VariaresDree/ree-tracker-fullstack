// Library › Lessons › ESAS › EE Laws, Codes, & Professional Ethics
// (2026-11-18): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order. It explains what each law does and why; for exact
// section wording, fines and the latest IRR amendments, read the law itself.
const r = String.raw;

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
      keyIdeas: [
        r`RA 7920 (1995) replaced RA 184 and covers the examination, registration and practice of electrical engineering.`,
        r`It recognizes three titles: Professional Electrical Engineer (PEE), Registered Electrical Engineer (REE) and Registered Master Electrician (RME).`,
        r`It creates the Board of Electrical Engineering under the PRC, and requires a license (and seal) to practise.`,
      ],
      example: {
        problem: r`A company hires an unlicensed graduate to sign electrical plans as the engineer of record. What does RA 7920 say?`,
        solution: r`Practising, or holding oneself out as an electrical engineer, without a valid registration is prohibited and punishable; plans must be signed and sealed by a duly licensed engineer within the scope of their title.`,
      },
      traps: [r`Graduating in electrical engineering is not a license to practise: passing the board and registering are.`],
    },
    {
      name: 'Implementing Rules and Regulations',
      inShort: r`The rules that put RA 7920 into practice.`,
      keyIdeas: [
        r`The Board, with the PRC, issues the IRR and resolutions: exam coverage, registration, seals, discipline.`,
        r`Rules have the force of law within the limits of the act.`,
        r`Board resolutions are published before taking effect.`,
      ],
      example: {
        problem: r`Where would you find the detailed syllabus of the REE board exam and the rules on the professional seal?`,
        solution: r`In the IRR and the Board of Electrical Engineering's resolutions issued under RA 7920, published by the PRC.`,
      },
      traps: [r`An IRR can't go beyond the law it implements.`],
    },
    {
      name: 'Board and Licensure',
      inShort: r`The Board of Electrical Engineering, the licensure exams and registration.`,
      keyIdeas: [
        r`The Board has a chairman and two members, appointed from Professional Electrical Engineers.`,
        r`REE exam: Mathematics 25%, ESAS 30%, EE 45%; pass with a 70% general average and no subject below 50%.`,
        r`PEE is earned by credentials (an REE's experience and record), not a written exam. The Board may suspend or revoke a certificate for cause, after due process.`,
      ],
      example: {
        problem: r`A candidate scores Mathematics 65, ESAS 70 and EE 74. Pass or fail?`,
        solution: r`$0.25(65) + 0.30(70) + 0.45(74) = 70.55\%$, and no subject is below 50: pass.`,
      },
      traps: [r`A subject below 50% fails the exam even if the general average is above 70%.`],
    },
    {
      name: 'Scope of Practice',
      inShort: r`What each title may do.`,
      keyIdeas: [
        r`PEE: the widest scope, including consultancy and signing and sealing designs and plans.`,
        r`REE: design, installation, operation and supervision of electrical systems within the law's limits.`,
        r`RME: installation, wiring, operation and maintenance of systems within the limits of power and voltage the law sets.`,
      ],
      example: {
        problem: r`An RME is asked to sign the design of a large industrial plant's substation. Should they?`,
        solution: r`No: that is beyond a master electrician's scope. It needs an engineer whose title covers it (in practice a PEE), and accepting it would also breach the code of ethics.`,
      },
      traps: [r`Working beyond your title's scope is both illegal and unethical, even if you are capable.`],
    },
    {
      name: 'Code of Ethics',
      inShort: r`How a professional electrical engineer behaves: to the public, clients, employers and colleagues.`,
      keyIdeas: [
        r`Public safety, health and welfare come first.`,
        r`Practise only within your competence; be honest in reports, bids and statements; disclose conflicts of interest.`,
        r`Don't supplant another engineer, take secret commissions, or criticize colleagues unfairly; keep client information confidential.`,
      ],
      example: {
        problem: r`A client asks you to approve an installation you know violates the PEC to save money. What do you do?`,
        solution: r`Refuse, explain the hazard and the code requirement in writing, and propose a compliant solution. Public safety outranks the client's wishes; if they proceed anyway, you may have to report it.`,
      },
      traps: [r`Loyalty to an employer never extends to hiding a safety hazard.`],
    },
    {
      name: 'Obligations and Contracts',
      inShort: r`The Civil Code rules behind every engineering contract.`,
      keyIdeas: [
        r`Obligations arise from law, contracts, quasi-contracts, delicts and quasi-delicts (Art. 1157).`,
        r`A contract needs consent, object and cause (Art. 1318), and is law between the parties (Art. 1159).`,
        r`Defective contracts: rescissible, voidable, unenforceable, void. Actions prescribe in 10 years (written), 6 (oral), 4 (quasi-delict).`,
      ],
      example: {
        problem: r`A contractor breached a written supply contract three years ago. Can the owner still sue? What if the claim were for negligence causing injury, five years ago?`,
        solution: r`Yes for the contract: written contracts prescribe in 10 years. The negligence (quasi-delict) claim has prescribed: 4 years.`,
      },
      traps: [r`A void contract produces no effect and can't be ratified; a voidable one is valid until annulled.`],
    },
    {
      name: 'RA 9136 EPIRA',
      inShort: r`The Electric Power Industry Reform Act of 2001, which restructured the power industry.`,
      keyIdeas: [
        r`Separated the industry into generation (competitive), transmission and distribution (regulated) and supply.`,
        r`Created the Energy Regulatory Commission (ERC), PSALM (to privatize NPC's assets) and the Wholesale Electricity Spot Market (WESM).`,
        r`Transmission went to TransCo, now operated by NGCP under a concession; open access and retail competition let large users choose their supplier.`,
      ],
      example: {
        problem: r`Which body sets distribution rates and enforces the Grid and Distribution Codes, and which one sold off NPC's power plants?`,
        solution: r`The ERC regulates rates and enforces the codes; PSALM privatized NPC's generation assets.`,
      },
      traps: [r`The DOE makes energy policy; the ERC regulates. Don't swap them.`],
    },
    {
      name: 'RA 9513 Renewable Energy',
      inShort: r`The Renewable Energy Act of 2008, which promotes power from renewable sources.`,
      keyIdeas: [
        r`Incentives for RE developers, such as an income-tax holiday and duty-free imports.`,
        r`Market tools: Renewable Portfolio Standards, feed-in tariffs, the Green Energy Option.`,
        r`Net metering for customers' own RE systems up to 100 kW.`,
      ],
      example: {
        problem: r`A homeowner installs a 10 kW rooftop solar system. What lets them sell their surplus to the distribution utility?`,
        solution: r`Net metering under RA 9513: systems up to 100 kW export surplus energy and are credited on their bill.`,
      },
      traps: [r`Net-metering credit is at the utility's blended generation cost, not the full retail rate.`],
    },
    {
      name: 'RA 11285 Energy Efficiency',
      inShort: r`The Energy Efficiency and Conservation Act of 2019.`,
      keyIdeas: [
        r`Makes energy efficiency a national policy, led by the DOE.`,
        r`Designated establishments (large energy users) must keep energy records, report consumption, and appoint energy conservation officers or managers.`,
        r`Minimum energy performance standards and energy labels for appliances, vehicles and buildings.`,
      ],
      example: {
        problem: r`A large factory is classed as a designated establishment. Name two things the law requires of it.`,
        solution: r`Appoint a certified energy conservation officer or manager, and keep and report its energy consumption (with energy audits and efficiency plans).`,
      },
      traps: [r`Energy efficiency (RA 11285) and renewable energy (RA 9513) are different laws.`],
    },
    {
      name: 'RA 10912 CPD',
      inShort: r`The Continuing Professional Development Act of 2016.`,
      keyIdeas: [
        r`Requires licensed professionals to keep learning after the board exam.`,
        r`CPD units from accredited programs count toward renewing the license.`,
        r`Each profession has a CPD Council under the PRC.`,
      ],
      example: {
        problem: r`Why does an REE need CPD units?`,
        solution: r`Under RA 10912, CPD is part of renewing the professional license, to keep practitioners' knowledge current.`,
      },
      traps: [r`Check the PRC's current CPD rules: the required units have been revised since 2016.`],
    },
    {
      name: 'Grid and Distribution Codes',
      inShort: r`The technical rules for connecting to and operating the grid and distribution systems.`,
      keyIdeas: [
        r`The Philippine Grid Code (latest 2016) and Distribution Code (2017) are issued and enforced by the ERC.`,
        r`They set performance standards (frequency around 60 Hz, voltage, harmonics, flicker), connection requirements, planning and operations.`,
        r`They apply to the grid operator, generators, distribution utilities and large users connected to them.`,
      ],
      example: {
        problem: r`A developer wants to connect a new solar farm to the transmission grid. Which code sets its technical requirements?`,
        solution: r`The Philippine Grid Code: connection, protection, power quality and operating requirements, coordinated with NGCP as the system operator.`,
      },
      traps: [r`The PEC governs installations inside premises; the Grid and Distribution Codes govern the networks.`],
    },
  ],
};
