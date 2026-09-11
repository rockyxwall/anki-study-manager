# Anki Study Management Architecture & Guidelines

Reference documentation for structuring academic subjects in Anki using flat decks and hierarchical tags.

---

## 1. Core Architecture: Flat Decks + Hierarchical Tags

Following the pattern established in `[🎓] Academic::2.[💻] ICT`:
- **Do not create deep subdecks** for chapters, sections, or topics.
- Keep one root deck per subject:
  - `[🎓] Academic::2.[💻] ICT`
  - `[🎓] Academic::7.[📊] Higher Math`
- Organize everything via **hierarchical tags**:
  - `subject::paper::chapter::role`

---

## 2. Minimum Information Principle (Concepts vs Problems)

Anki's Spaced Repetition System (SRS) is designed for **atomic single-fact recall**.

### A. Concepts (`math::pX::chY::concept`) — **ACTIVE**
- **What belongs here:**
  - Definitions & Axioms (e.g. Symmetric matrix $A^T=A$, Continuity condition $LHL = RHL = f(a)$).
  - Formulas & Identities (e.g. Section formula, Circle general equation center $(-g,-f)$).
  - Conditions (e.g. Perpendicular lines $m_1 m_2 = -1$, Tangency conditions).
  - Shortcut Values (e.g. $\sqrt{\pm i} = \pm \frac{1}{\sqrt{2}}(1 \pm i)$, $\omega^3 = 1$).
- **Card Format:** Cloze deletion, Basic Q&A (single answer), or Image Occlusion on formula sheets.
- **State in Anki:** Active (`-is:suspended`), prioritized in daily reviews.

### B. Problems (`math::pX::chY::problem`) — **SUSPENDED**
- **What belongs here:**
  - Multi-step exercise problems with arbitrary coordinates.
  - Multi-line proofs (e.g. 8 determinant row/column operation proofs).
  - Long limit derivations.
- **Why suspend:** Multi-step solving causes SRS review fatigue. Full math problems belong on paper practice, not daily 10-second flashcard recall.
- **State in Anki:** Tagged and suspended (`is:suspended`). Available for manual lookup, but invisible to daily review queues.

---

## 3. Math Tag Taxonomy

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
           ├── concept          <- Complex numbers, roots of unity, loci
           └── problem          <- Complex number problem exercises
```

---

## 4. Class 11 & Foundation Concept Syllabus Checklist

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

---

## 5. Maintenance Scripts

- **`scripts/migrate-math-deck.mjs`**:
  - Automatically audits all Higher Math cards.
  - Classifies into `*::concept` vs `*::problem`.
  - Enforces suspension on problems and active status on concepts.
  - Supports `--dry-run`, `--execute`, and `--restore`.
- **`scripts/describe-io-cards.mjs`**:
  - Batch-describes Image Occlusion flashcards with Gemini Vision API.
  - Extracts title, formulas, and topic tags automatically.

