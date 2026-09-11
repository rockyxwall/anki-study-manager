# NCTB Class 11-12 (HSC) Chemistry Curriculum Ground Truth

Authentic reference for Class 11–12 Chemistry 1st and 2nd Paper chapters, foundational basics, core topics, and standardized hierarchical Anki tag taxonomy.

---

## 1. Chemistry 1st Paper (রসায়ন ১ম পত্র)

| Chapter | Bengali Title | English Title | Core Focus & Testable Concepts | Canonical Tag Prefix |
| :--- | :--- | :--- | :--- | :--- |
| **Basics** | রসায়ন প্রাথমিক ভিত্তি | Chemistry Foundations | Pre-Class 11 periodic table memory pegs (Z=1 to 118), basic chemical nomenclature, fundamental symbols | `chemistry::basics` |
| **Ch 1** | ল্যাবরেটরির নিরাপদ ব্যবহার | Safe Use of Laboratory | Glassware cleaning, semi-micro & micro methods, hazard symbols, first aid, lab safety regulations | `chemistry::p1::ch1` |
| **Ch 2** | গুণগত রসায়ন | Qualitative Chemistry | Rutherford vs. Bohr atomic models, quantum numbers ($n, l, m, s$), Aufbau/Hund/Pauli, hydrogen emission spectrum, Rydberg formula, solubility product ($K_{sp}, K_{ip}$), common ion effect, cation/anion analysis, chromatography | `chemistry::p1::ch2` |
| **Ch 3** | মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন | Periodic Properties & Chemical Bonding | Periodic Table blocks ($s, p, d, f$), atomic radius, ionization energy, electron affinity, electronegativity, chemical bonding (ionic, covalent, coordinate), Fajan's rules, hybridization ($sp, sp^2, sp^3, sp^3d, sp^3d^2$), VSEPR, hydrogen bonding | `chemistry::p1::ch3` |
| **Ch 4** | রাসায়নিক পরিবর্তন | Chemical Changes | Reaction rate, activation energy, Arrhenius equation, dynamic equilibrium, Le Chatelier's principle, $K_p$ & $K_c$, acid-base theories, pH & pOH calculations, buffer solutions (Henderson-Hasselbalch), reaction enthalpy ($\Delta H$), Hess's law | `chemistry::p1::ch4` |
| **Ch 5** | কর্মমুখী রসায়ন | Applied Chemistry | Food preservation, chemical preservatives, vinegar production, suspension vs. emulsion, toiletries (glass cleaner, toilet cleaner), talcum powder, cold cream | `chemistry::p1::ch5` |

---

## 2. Chemistry 2nd Paper (রসায়ন ২য় পত্র)

| Chapter | Bengali Title | English Title | Core Focus & Testable Concepts | Canonical Tag Prefix |
| :--- | :--- | :--- | :--- | :--- |
| **Ch 1** | পরিবেশ রসায়ন | Environmental Chemistry | Atmospheric layers, gas laws (Boyle, Charles, Avogadro), Ideal gas equation ($PV = nRT$), Dalton's partial pressure, Graham's effusion law, real gases & van der Waals, greenhouse effect, acid rain, water purity standards (BOD, COD, DO, TDS) | `chemistry::p2::ch1` |
| **Ch 2** | জৈব রসায়ন | Organic Chemistry | IUPAC nomenclature, isomerism (chain, position, functional, metamerism, tautomerism, cis-trans, optical), hydrocarbons (alkane, alkene, alkyne), aromaticity (Hückel's rule), electrophilic/nucleophilic substitution ($S_N1, S_N2, E1, E2$), alcohols, carbonyls (Aldol, Cannizzaro), carboxylic acids, amines, polymers | `chemistry::p2::ch2` |
| **Ch 3** | পরিমাণগত রসায়ন | Quantitative Chemistry | Mole concept, molarity ($S = \frac{1000w}{MV}$), molality, ppm, stoichiometry, limiting reactants, acid-base titrations, redox reactions & balancing ($KMnO_4, K_2Cr_2O_7$), iodometry, Beer-Lambert law | `chemistry::p2::ch3` |
| **Ch 4** | তড়িৎ রসায়ন | Electrochemistry | Electrolytic vs galvanic cells, Faraday's laws of electrolysis ($W = ZIt$), electrochemical series, standard electrode potentials ($E^\circ$), Nernst equation, Daniell cell, lead-acid storage battery, lithium-ion battery, hydrogen fuel cell | `chemistry::p2::ch4` |
| **Ch 5** | অর্থনৈতিক রসায়ন | Economic Chemistry | Natural gas, coal, urea fertilizer manufacturing, cement production, glass, pulp & paper, leather tanning, effluent treatment plant (ETP), industrial waste & recycling | `chemistry::p2::ch5` |

---

## 3. Five-Tier Role Taxonomy

Following the HSC Board Question architecture:

1. `concept`: Core theoretical principles, formulas, laws, rules (Aufbau, Le Chatelier, Fajan), diagrams -> **ACTIVE**.
2. `cq::k`: CQ Mark 1 (ক - জ্ঞানমূলক): Exact 1-line definitions, units, scientific constants, IUPAC names -> **ACTIVE**.
3. `cq::kh`: CQ Mark 2 (খ - অনুধাবনমূলক): "Why" explanations, differentiation (e.g., Bohr vs. Rutherford, ideal vs. real gas) -> **ACTIVE**.
4. `mcq`: Objective board and admission test questions -> **ACTIVE**.
5. `problem` (or `cq::problem`): CQ Mark 3/4 (গ/ঘ - প্রয়োগ ও উচ্চতর দক্ষতা): Multi-step quantitative math (solubility, titration, stoichiometry, Nernst, pH calculations) -> **SUSPENDED**.
6. `peg`: Pre-Class 11 periodic table mnemonic memory pegs (`chemistry::basics::peg`) -> **34 reviewed cards ACTIVE; 556 unstudied cards SUSPENDED**.
