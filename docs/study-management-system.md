# Anki Study Management Architecture & Guidelines

Reference documentation for structuring academic subjects in Anki using flat decks and hierarchical tags.

---

## 1. Core Architecture: Flat Decks + Hierarchical Tags

Standardized structure across all academic subjects:
- **Do not create deep subdecks** for chapters, sections, or topics.
- Keep one root deck per subject:
  - `[🎓] Academic::2.[💻] ICT`
  - `[🎓] Academic::7.[📊] Higher Math`
- Organize all content via **hierarchical tags**:
  - Multi-paper subjects (e.g. Math): `subject::paper::chapter::role`
  - Single-paper subjects (e.g. ICT): `subject::chapter::role` or `subject::chapter::section::role`

---

## 2. Minimum Information Principle (Concepts vs MCQs vs Problems)

Anki's Spaced Repetition System (SRS) is designed for **atomic single-fact recall** (under 10 seconds per card).

### A. Concepts (`<subject>::*::concept`) — **ACTIVE**
- **What belongs here:**
  - **Higher Math:** Definitions, formulas, identities, geometrical conditions, standard values ($\omega^3=1$, $\sqrt{\pm i}$).
  - **ICT:** Technical terms, bandwidth speeds, protocol numbers, transmission types, number system bases/weights/codes (BCD, ASCII, Unicode), logic gate truth equations/theorems, HTML tags/attributes, C language syntax/data types/format specifiers, database keys/SQL commands.
- **Card Format:** Cloze deletion, Basic Q&A (single answer), Image Occlusion on formula sheets, comparison tables, and circuit diagrams.
- **State in Anki:** Active (`-is:suspended`), prioritized in daily review queues.

### B. MCQs (`<subject>::*::mcq`) — **ACTIVE**
- **What belongs here:**
  - **Higher Math & ICT:** Board questions, test paper multiple-choice questions, and factual question sheets.
  - Testable options, rapid-fire identification, and option occlusions.
- **Card Format:** Image Occlusion on question sets, 4-choice Q&A, or Cloze on question stems.
- **State in Anki:** Active (`-is:suspended`), prioritized in daily review queues alongside concepts.

### C. Problems (`<subject>::*::problem`) — **SUSPENDED**
- **What belongs here:**
  - **Higher Math:** Multi-step coordinate geometry problems, 8-step determinant row/column operation proofs, multi-line limit derivations.
  - **ICT:** Multi-step base conversions with fractional calculations, step-by-step 2's complement subtraction workings, complete multi-variable truth table solving proofs, full algorithmic C programs (sorting, series sum, prime checks), multi-table SQL join query writing.
- **Why suspend:** Multi-step calculation cards cause SRS review fatigue and card failure loops. Full problem solving belongs on paper practice and IDE coding, not daily flashcard recall.
- **State in Anki:** Tagged and suspended (`is:suspended`). Searchable for reference, but excluded from daily reviews.

---

## 3. Tag Taxonomies

### 3.1 Higher Math Tag Taxonomy

```
math
 ├── basics
 │    └── concept               <- Pre-Class 11 SSC foundations (algebra, radicals, basic trig)
 ├── p1
 │    ├── ch1
 │    │    ├── concept          <- Matrix & Determinants laws, formulas, conditions (ACTIVE)
 │    │    └── problem          <- Determinant proofs & exercises (SUSPENDED)
 │    ├── ch2
 │    │    └── concept          <- Vectors (formulas, dot/cross products)
 │    ├── ch3
 │    │    ├── concept          <- Straight Lines formulas (section, centroid, locus, distance)
 │    │    └── problem          <- Solved coordinate geometry problems
 │    ├── ch4
 │    │    ├── concept          <- Circle standard/general forms, tangents, touching conditions
 │    │    └── problem          <- Solved circle problems
 │    ├── ch5
 │    │    └── concept          <- Permutations & Combinations formulas
 │    ├── ch6
 │    │    └── concept          <- Basic Trigonometric ratios & values
 │    ├── ch7
 │    │    ├── concept          <- Associated angles, compound angles, sine/cosine rules
 │    │    └── problem          <- Step-by-step trigonometric proofs
 │    ├── ch8
 │    │    └── concept          <- Functions & Graphs (domain, range, one-to-one, inverse)
 │    ├── ch9
 │    │    ├── concept          <- Limits, continuity conditions, derivative formulas
 │    │    └── problem          <- Multi-step limit evaluations
 │    └── ch10
 │         └── concept          <- Integration standard formulas & properties
 └── p2
      └── ch3
           ├── concept          <- Complex numbers, roots of unity, loci (ACTIVE)
           ├── mcq              <- Complex numbers board / test MCQs (ACTIVE)
           └── problem          <- Complex number problem exercises (SUSPENDED)
```

### 3.2 ICT Tag Taxonomy

```
ict
 ├── ch1
 │    ├── concept               <- Global Village, VR, AI, Robotics, Cryosurgery, Biometrics, Nanotech (ACTIVE)
 │    ├── mcq                   <- Board exam multiple-choice questions & option occlusions (ACTIVE)
 │    └── problem               <- Long case scenario evaluations (SUSPENDED)
 ├── ch2
 │    ├── concept               <- Data comm, bandwidth, transmission modes/methods, media, topologies, cloud (ACTIVE)
 │    ├── mcq                   <- Board exam multiple-choice questions & option occlusions (ACTIVE)
 │    └── problem               <- Transmission delay calculations, IP subnetting exercises (SUSPENDED)
 ├── ch3
 │    ├── 3.1
 │    │    ├── concept          <- Number systems (bases, weights, codes: BCD, ASCII, Unicode) (ACTIVE)
 │    │    ├── mcq              <- Number systems board MCQs (ACTIVE)
 │    │    └── problem          <- Multi-step base conversions, 2's complement arithmetic (SUSPENDED)
 │    └── 3.2
 │         ├── concept          <- Boolean theorems, logic gates, truth table properties, adders, registers (ACTIVE)
 │         ├── mcq              <- Logic gates & circuits board MCQs (ACTIVE)
 │         └── problem          <- Complex circuit simplification proofs, truth table solving (SUSPENDED)
 ├── ch4
 │    ├── concept               <- HTML tags, attributes, lists, tables, links, forms, CSS basics (ACTIVE)
 │    ├── mcq                   <- Web design & HTML board MCQs (ACTIVE)
 │    └── problem               <- Full-page HTML website code authoring (SUSPENDED)
 ├── ch5
 │    ├── concept               <- C syntax, data types, format specifiers, operators, loop rules (ACTIVE)
 │    ├── mcq                   <- C programming board MCQs (ACTIVE)
 │    └── problem               <- Full algorithmic C programs (primes, series, sorting, patterns) (SUSPENDED)
 └── ch6
      ├── concept               <- Database keys (Primary, Foreign), normalization, SQL command syntax (ACTIVE)
      ├── mcq                   <- Database management board MCQs (ACTIVE)
      └── problem               <- Multi-table SQL query scripts, complex ER diagrams (SUSPENDED)
```

---

## 4. Concept Syllabus Checklists

### 4.1 Higher Math Concept Checklist

| Level / Chapter | Subject / Topic | Key Single-Answer Concepts to Retain |
|---|---|---|
| `math::basics` | SSC / Pre-11 Basics | Factoring rules, exponent laws ($x^a x^b = x^{a+b}$), logarithm rules ($\log(ab) = \log a + \log b$), basic trig values ($0^\circ, 30^\circ, 45^\circ, 60^\circ, 90^\circ$), Pythagorean identities, slope formula $m = \frac{y_2-y_1}{x_2-x_1}$. |
| `math::p1::ch1` | Matrices & Determinants | Matrix types (Symmetric $A^T=A$, Skew-symmetric $A^T=-A$, Hermitian, Singular $|A|=0$), Adjoint, Inverse $A^{-1}=\frac{1}{\|A\|}\text{adj}(A)$, Determinant properties. |
| `math::p1::ch2` | Vectors | Dot product $\vec{a}\cdot\vec{b} = ab\cos\theta$, Cross product $\vec{a}\times\vec{b} = ab\sin\theta\,\hat{\eta}$, Perpendicular condition ($\vec{a}\cdot\vec{b}=0$), Parallel condition ($\vec{a}\times\vec{b}=\vec{0}$). |
| `math::p1::ch3` | Straight Lines | Section formula (internal/external), Centroid, Shoelace formula, Slope-intercept, Intercept form, Normal form, Distance from point to line $d=\frac{\|ax_1+by_1+c\|}{\sqrt{a^2+b^2}}$, Parallel line distance. |
| `math::p1::ch4` | Circle | Standard form $(x-h)^2+(y-k)^2=r^2$, General form center $(-g,-f)$ and $r=\sqrt{g^2+f^2-c}$, Diameter form, Touching conditions (external $c_1c_2=r_1+r_2$, internal $c_1c_2=\|r_1-r_2\|$), Tangent condition. |
| `math::p1::ch5` | Permutations & Combinations | Permutation $^nP_r = \frac{n!}{(n-r)!}$, Combination $^nC_r = \frac{n!}{r!(n-r)!}$, Pascal identity $^{n-1}C_{r-1} + ^{n-1}C_r = ^nC_r$, Circular permutations $(n-1)!$, Repeated elements $\frac{n!}{p!q!r!}$. |
| `math::p1::ch6 & ch7` | Trigonometry | Compound angles ($\sin(A\pm B)$, $\cos(A\pm B)$, $\tan(A\pm B)$), Double/triple angles, Sum-to-product ($C\pm D$), Product-to-sum, Sine rule $\frac{a}{\sin A} = 2R$, Cosine rule. |
| `math::p1::ch8` | Functions & Graphs | Domain and range definitions, One-to-one condition $f(x_1)=f(x_2)\implies x_1=x_2$, Onto condition, Inverse condition (bijective), Even/Odd condition ($f(-x) = \pm f(x)$). |
| `math::p1::ch9` | Differentiation | Limit definition, Continuity condition ($LHL = RHL = f(a)$), First principle definition, Standard derivative formulas ($x^n, e^x, \ln x, \sin x, \cos x, \tan x, \sec x$), Product & Quotient rules, Chain rule. |
| `math::p1::ch10` | Integration | Standard antiderivatives ($\int x^n dx, \int \frac{1}{x}dx, \int e^x dx, \int \sin x dx, \int \sec^2 x dx$), Integration by parts $\int u v dx$, Definite integral properties. |
| `math::p2::ch3` | Complex Numbers | Imaginary unit $i^2=-1$, $\sqrt{-a} = i\sqrt{a}$, Cube roots of unity ($1+\omega+\omega^2=0$, $\omega^3=1$, high powers $\omega^n$), Modulus-argument form, Complex loci, Shortcut values $\sqrt{\pm i}$. |

### 4.2 ICT Concept Checklist

| Chapter Tag | Topic / Domain | Key Single-Answer Concepts to Retain |
|---|---|---|
| `ict::ch1` | World & Bangladesh Perspective | Marshall McLuhan (Global Village); VR components (HMD, data glove); AI (John McCarthy, Turing test, Expert System = Knowledge Base + Inference Engine); Robotics (actuators, sensors, manipulators); Cryosurgery (liquid nitrogen $-196^\circ\text{C}$, argon gas); Biometrics (physiological: fingerprint, iris, retina, face, hand geometry; behavioral: voice, signature, keystroke); Bioinformatics (biological data algorithms); Genetic Engineering (recombinant DNA, restriction enzymes, vectors/plasmids, GMO); Nanotechnology (Norio Taniguchi, 1 to 100 nm, bottom-up vs top-down). |
| `ict::ch2` | Communication Systems & Networking | Data communication 5 components (Message, Sender, Receiver, Medium, Protocol); Bandwidth categories (Narrow: 45–300 bps; Voice: 300–9600 bps; Broad: $\ge 1\text{ Mbps}$); Transmission modes (Simplex, Half-Duplex, Full-Duplex; Unicast, Multicast, Broadcast); Transmission methods (Asynchronous: start/stop bit; Synchronous: block/frame 80–132 bytes; Isochronous: real-time constant delay); Media (Twisted pair: UTP/STP, RJ-45; Coaxial: BNC, copper core; Optical Fiber: core, cladding, buffer, total internal reflection); Wireless standards (Radio wave: 3 kHz–300 GHz; Microwave: line-of-sight, geostationary satellite 36,000 km; Bluetooth: IEEE 802.15, 2.4 GHz, 10m; Wi-Fi: IEEE 802.11, WLAN; WiMAX: IEEE 802.16, WMAN); Network topologies (Bus: backbone & terminators; Star: central hub/switch; Ring: token ring; Mesh: point-to-point $\frac{N(N-1)}{2}$; Tree: hierarchical; Hybrid); Cloud Computing models (IaaS, PaaS, SaaS; Public, Private, Hybrid, Community). |
| `ict::ch3::3.1` | Number Systems & Codes | Positional bases (Binary: 2, Octal: 8, Decimal: 10, Hexadecimal: 16); Bit, Nibble (4 bits), Byte (8 bits), Radix point; Direct conversions (Binary $\leftrightarrow$ Octal: 3 bits; Binary $\leftrightarrow$ Hex: 4 bits); 1's complement (invert bits); 2's complement (1's comp + 1; MSB: 0 positive, 1 negative); $n$-bit range ($-2^{n-1}$ to $2^{n-1}-1$); Codes (BCD: BCD 8421; EBCDIC: 8-bit IBM; ASCII: ASCII-7 128 chars, ASCII-8 256 chars, '0'=48, 'A'=65, 'a'=97; Unicode: 16/32-bit, 65,536 characters, supports Bengali). |
| `ict::ch3::3.2` | Digital Logic & Boolean Algebra | Boolean postulates ($A+0=A, A+1=1, A+\overline{A}=1, A+A=A, A\cdot 1=A, A\cdot 0=0, A\cdot\overline{A}=0, A\cdot A=A$); Involution $\overline{\overline{A}}=A$; De Morgan's laws ($\overline{A+B} = \overline{A}\cdot\overline{B}$, $\overline{A\cdot B} = \overline{A}+\overline{B}$); Duality principle ($+\leftrightarrow \cdot, 0\leftrightarrow 1$); Basic gates (AND, OR, NOT); Universal gates (NAND, NOR); Special gates (XOR: $A\oplus B = \overline{A}B + A\overline{B}$, XNOR: $\overline{A\oplus B} = AB + \overline{A}\,\overline{B}$); Half Adder ($S=A\oplus B, C=AB$); Full Adder ($S=A\oplus B\oplus C_{in}$, $C_{out}=AB + C_{in}(A\oplus B)$); Encoder ($2^n \to n$); Decoder ($n \to 2^n$); Flip-Flop (1-bit storage element: RS, JK, D, T); Register ($n$-bit storage); Counter (MOD-$N$, asynchronous ripple, synchronous). |
| `ict::ch4` | Web Design & HTML | Website structure types (Linear, Hierarchical/Tree, Webbed/Network, Hybrid); URL parts (protocol, domain/host, port, path, filename); IP addresses (IPv4: 32-bit / 4 octets, IPv6: 128-bit / 8 hexadecimal groups); DNS (domain name to IP translation); HTML basic boilerplate (`<!DOCTYPE html>`, `<html>`, `<head>`, `<title>`, `<body>`); Essential tags (`<h1>`–`<h6>`, `<p>`, `<br>`, `<hr>`, `<b>`, `<i>`, `<u>`, `<sub>`, `<sup>`); Media & Hyperlinks (`<a href="..." target="_blank">`, `<img src="..." alt="...">`); Lists (`<ul>`, `<ol type="...">`, `<li>`); Tables (`<table>`, `<tr>`, `<th>`, `<td>`, `rowspan`, `colspan`, `border`); Form elements (`<form>`, `<input type="text|password|radio|checkbox|submit|reset">`, `<select>`, `<option>`). |
| `ict::ch5` | Programming Language (C) | Generations (1GL machine, 2GL assembly, 3GL high-level, 4GL SQL, 5GL AI/logic); Translators (Compiler: whole source code; Interpreter: line-by-line; Assembler: assembly mnemonics); Algorithm & Flowchart symbols (Oval: terminal, Parallelogram: I/O, Rectangle: process, Diamond: decision, Circle: connector); C structure (`#include <stdio.h>`, `main()`, `{}`); 32 ANSI keywords; Data types & sizes (`char` 1B, `int` 2/4B, `float` 4B, `double` 8B); Format specifiers (`%d`, `%f`, `%c`, `%s`, `%lf`); Operators (Arithmetic, Relational `==,!=,<,>`, Logical `&&,||,!`, Increment `++,--`, Ternary `?:`); Control flow (`if`, `if-else`, `switch-case-break-default`, Loops: `for`, `while`, `do-while`, Loop controls: `break`, `continue`); Array declaration & 0-based indexing (`arr[0]`), string terminator (`\0`). |
| `ict::ch6` | Database Management System (DBMS) | Data hierarchy (Bit $\to$ Byte $\to$ Field $\to$ Record $\to$ Table/File $\to$ Database); DBMS vs RDBMS; Keys (Primary Key: unique non-null identifier, Foreign Key: references primary key in parent table, Composite Key: multi-field combination primary key); Relationships (1:1, 1:N, M:N via junction table); SQL sub-languages (DDL: `CREATE`, `ALTER`, `DROP`; DML: `SELECT`, `INSERT`, `UPDATE`, `DELETE`; DCL: `GRANT`, `REVOKE`); SQL syntax (`SELECT col FROM tbl WHERE cond ORDER BY col ASC/DESC`); Normalization (1NF: atomic attributes; 2NF: no partial dependency; 3NF: no transitive dependency); Indexing & database security. |

---

## 5. Maintenance Scripts

- **`scripts/migrate-math-deck.mjs`**:
  - Audits Higher Math cards.
  - Classifies into `math::pX::chY::concept` vs `math::pX::chY::problem`.
  - Suspends problems, keeps concepts active.
  - Consolidates into flat root deck `[🎓] Academic::7.[📊] Higher Math`.
  - Deletes empty subdecks leaf-first.
  - Flags: `--dry-run`, `--execute`, `--restore`.
- **`scripts/migrate-ict-deck.mjs`**:
  - Audits ICT cards.
  - Classifies into `ict::chX::concept` (or `ict::ch3::3.X::concept`) vs `ict::chX::problem`.
  - Suspends problems, keeps concepts active.
  - Enforces flat root deck `[🎓] Academic::2.[💻] ICT`.
  - Flags: `--dry-run`, `--execute`, `--restore`.
- **`scripts/describe-io-cards.mjs`**:
  - Batch-describes Image Occlusion flashcards with Gemini Vision API.
  - Extracts title, formulas, and topic tags automatically.
