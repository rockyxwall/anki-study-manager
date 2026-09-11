import fs from 'fs';

const notes = JSON.parse(fs.readFileSync('data/math_all_notes_clean.json', 'utf8'));

console.log(`=== FULL AUDIT OF ALL ${notes.length} MATH NOTES ===\n`);

const issues = [];

notes.forEach((n, idx) => {
    const text = n.cleanText;
    const tLower = text.toLowerCase();
    const curr = n.tags[0] || 'NONE';

    let suggested = null;
    let noteReason = '';

    // 1. Check for Circle content tagged as something else, or something else tagged as Circle
    if (curr.startsWith('math::p1::ch4')) {
        // Must be circle
        if (tLower.includes('বীজগণিত সূত্র') || tLower.includes('algebraic expansion of trinomial') || tLower.includes('(a + b + c)^2')) {
            suggested = 'math::basics::concept';
            noteReason = 'Trinomial square expansion is basic algebra, not circle.';
        }
    }

    // 2. Check for Circle chord in Ch3
    if (curr.startsWith('math::p1::ch3')) {
        if (tLower.includes('বৃত্তের জ্যা') || tLower.includes('length of circle chord') || (tLower.includes('chord length') && tLower.includes('radius'))) {
            suggested = 'math::p1::ch4::problem';
            noteReason = 'Circle chord length problem belongs to Ch4 (Circle), not Ch3 (Straight line).';
        }
    }

    // 3. Check for Trigonometry chapters: Ch6 (Trig Ratios) vs Ch7 (Compound Angles) vs 2nd Paper Ch7 (Inverse Trig)
    if (curr.startsWith('math::p1::ch7') || curr.startsWith('math::p1::ch6') || curr.startsWith('math::p2::ch7')) {
        if (tLower.includes('circular system') || tLower.includes('centesimal') || tLower.includes('radian') || tLower.includes('angle measurement') || tLower.includes('ষাটমূলক') || tLower.includes('বৃত্তীয়')) {
            suggested = curr.includes('problem') ? 'math::p1::ch6::problem' : 'math::p1::ch6::concept';
            noteReason = 'Measurement of angles (degrees, radians, circular/centesimal system) is Ch6 (Trigonometric Ratios), not Ch7 (Associated Angles).';
        }
        if (tLower.includes('inverse') && (tLower.includes('sin^{-1}') || tLower.includes('tan^{-1}'))) {
            suggested = curr.includes('problem') ? 'math::p2::ch7::problem' : 'math::p2::ch7::concept';
            noteReason = 'Inverse trigonometric functions belong to Paper 2 Ch7.';
        }
    }

    // 4. Check for Conics (Paper 2 Ch6) vs Circle (Paper 1 Ch4) vs Straight Lines (Paper 1 Ch3)
    if (tLower.includes('parabola') || tLower.includes('ellipse') || tLower.includes('hyperbola') || tLower.includes('পরাবৃত্ত') || tLower.includes('উপবৃত্ত') || tLower.includes('অধিবৃত্ত')) {
        if (!curr.startsWith('math::p2::ch6')) {
            suggested = curr.includes('problem') ? 'math::p2::ch6::problem' : 'math::p2::ch6::concept';
            noteReason = 'Conics belong to Paper 2 Chapter 6.';
        }
    }

    // 5. Check for Polynomials & Quadratic Equations (Paper 2 Ch4) vs math::basics
    if (curr.startsWith('math::basics')) {
        if (tLower.includes('standard quadratic equation') || tLower.includes('ax^2 + bx + c = 0') || tLower.includes('roots found via quadratic formula')) {
            // In NCTB, quadratic equations & roots are taught in Paper 2 Ch4 (Polynomials & Quadratic Equations)
            // Or is it basics? Note: NCTB Paper 2 Chapter 4 is specifically "বহুপদী ও বহুপদী সমীকরণ" which covers ax^2+bx+c=0 and roots!
            noteReason = 'Candidate for math::p2::ch4 (Polynomials & Quadratic Equations) or math::basics.';
        }
    }

    // 6. Check for Calculus / Differentiation (Ch9) vs Functions (Ch8)
    if (curr.startsWith('math::p1::ch9')) {
        if (tLower.includes('function definition and mapping') && !tLower.includes('limit') && !tLower.includes('derivative') && !tLower.includes('differentiation')) {
            suggested = 'math::p1::ch8::concept';
            noteReason = 'Function mapping and graphs belongs to Ch8 (Functions), not Ch9.';
        }
    }

    // 7. Check for Matrix / Determinant in wrong chapter or other topics in Ch1
    if (curr.startsWith('math::p1::ch1')) {
        if (!tLower.includes('matrix') && !tLower.includes('ম্যাট্রিক্স') && !tLower.includes('determinant') && !tLower.includes('নির্ণায়ক') && !tLower.includes('cramer')) {
            suggested = 'NEEDS_REVIEW';
            noteReason = 'Does not mention matrix or determinant.';
        }
    }

    if (suggested || noteReason) {
        issues.push({ id: n.id, curr, suggested, noteReason, text: text.slice(0, 140) });
    }
});

console.log(`Identified ${issues.length} potential discrepancies/curriculum alignment points:`);
issues.forEach(it => {
    console.log(`\nNote ${it.id}:`);
    console.log(`  Current Tag: ${it.curr}`);
    console.log(`  Suggested:   ${it.suggested || 'SAME (inspect note)'}`);
    console.log(`  Reason:      ${it.noteReason}`);
    console.log(`  Content:     "${it.text}..."`);
});

