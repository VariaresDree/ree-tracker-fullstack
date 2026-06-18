// src/components/ReferenceHub.jsx
import React, { useState } from 'react';
import LatexRenderer from './LatexRenderer';
import { useStore } from '../store/useStore'; // 🚀 FIXED: Dynamic Store Import

// ============================================================================
// OFFLINE FORMULA MATRIX (FULLY EXPANDED & VERIFIED)
// ============================================================================
const OFFLINE_FORMULAS = {
    Mathematics: [
        // --- Algebra & Complex Numbers ---
        { title: "Quadratic Formula", eq: `$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`, subtopics: ["Algebra & Complex Numbers", "General"] },
        { title: "Polar Form of a Complex Number", eq: `$$z = x + iy = r(\\cos \\theta + i \\sin \\theta)$$`, subtopics: ["Algebra & Complex Numbers", "General"] },
        { title: "Magnitude (Modulus) of a Complex Number", eq: `$$|z| = \\sqrt{x^2 + y^2}$$`, subtopics: ["Algebra & Complex Numbers", "General"] },
        { title: "De Moivre's Theorem", eq: `$$[r(\\cos \\theta + i \\sin \\theta)]^n = r^n(\\cos n\\theta + i \\sin n\\theta)$$`, subtopics: ["Algebra & Complex Numbers"] },
        { title: "Roots of a Complex Number", eq: `$$z^{\\frac{1}{n}} = r^{\\frac{1}{n}} \\left[ \\cos\\left(\\frac{\\theta + 360^\\circ k}{n}\\right) + i \\sin\\left(\\frac{\\theta + 360^\\circ k}{n}\\right) \\right]$$`, subtopics: ["Algebra & Complex Numbers"] },
        { title: "Natural Logarithm of a Complex Number", eq: `$$\\ln(z) = \\ln(r) + i(\\theta + 2k\\pi)$$`, subtopics: ["Algebra & Complex Numbers"] },
        { title: "Nth Term of an Arithmetic Progression", eq: `$$a_n = a_1 + (n - 1)d$$`, subtopics: ["Algebra & Complex Numbers", "General"] },
        { title: "Sum of an Arithmetic Progression", eq: `$$S_n = \\frac{n}{2}(a_1 + a_n) = \\frac{n}{2}[2a_1 + (n - 1)d]$$`, subtopics: ["Algebra & Complex Numbers", "General"] },
        { title: "Sum of a Finite Geometric Progression", eq: `$$S_n = \\frac{a_1(1 - r^n)}{1 - r}$$`, subtopics: ["Algebra & Complex Numbers", "General"] },
        { title: "Sum of an Infinite Geometric Series", eq: `$$S_\\infty = \\frac{a_1}{1 - r}, \\quad |r| < 1$$`, subtopics: ["Algebra & Complex Numbers", "General"] },
        { title: "Binomial Theorem", eq: `$$(x + y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k}y^k$$`, subtopics: ["Algebra & Complex Numbers"] },

        // --- Trigonometry ---
        { title: "Pythagorean Identity", eq: `$$\\sin^2 \\theta + \\cos^2 \\theta = 1$$`, subtopics: ["Trigonometry", "General"] },
        { title: "Law of Cosines", eq: `$$c^2 = a^2 + b^2 - 2ab \\cos C$$`, subtopics: ["Trigonometry", "General"] },
        { title: "Double Angle Formula (Sine)", eq: `$$\\sin(2\\theta) = 2\\sin\\theta \\cos\\theta$$`, subtopics: ["Trigonometry", "General"] },
        { title: "Law of Sines", eq: `$$\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}$$`, subtopics: ["Trigonometry", "General"] },
        { title: "Double Angle Formula (Cosine)", eq: `$$\\cos(2\\theta) = \\cos^2\\theta - \\sin^2\\theta = 2\\cos^2\\theta - 1 = 1 - 2\\sin^2\\theta$$`, subtopics: ["Trigonometry", "General"] },
        { title: "Angle Addition Formula (Sine)", eq: `$$\\sin(A \\pm B) = \\sin A \\cos B \\pm \\cos A \\sin B$$`, subtopics: ["Trigonometry"] },
        { title: "Angle Addition Formula (Cosine)", eq: `$$\\cos(A \\pm B) = \\cos A \\cos B \\mp \\sin A \\sin B$$`, subtopics: ["Trigonometry"] },
        { title: "Pythagorean Identity (Tangent & Secant)", eq: `$$1 + \\tan^2 \\theta = \\sec^2 \\theta$$`, subtopics: ["Trigonometry", "General"] },
        { title: "Area of a Triangle (Trigonometric)", eq: `$$Area = \\frac{1}{2}ab \\sin C$$`, subtopics: ["Trigonometry", "General"] },
        { title: "Power-Reducing Formula (Sine)", eq: `$$\\sin^2\\theta = \\frac{1 - \\cos(2\\theta)}{2}$$`, subtopics: ["Trigonometry"] },

        // --- Analytic Geometry ---
        { title: "Distance Between Two Points", eq: `$$d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$`, subtopics: ["Analytic Geometry", "General"] },
        { title: "Standard Equation of a Circle", eq: `$$(x - h)^2 + (y - k)^2 = r^2$$`, subtopics: ["Analytic Geometry", "General"] },
        { title: "Midpoint Formula", eq: `$$M = \\left(\\frac{x_1 + x_2}{2}, \\frac{y_1 + y_2}{2}\\right)$$`, subtopics: ["Analytic Geometry", "General"] },
        { title: "Slope of a Line", eq: `$$m = \\frac{y_2 - y_1}{x_2 - x_1}$$`, subtopics: ["Analytic Geometry", "General"] },
        { title: "Point-Slope Form of a Line", eq: `$$y - y_1 = m(x - x_1)$$`, subtopics: ["Analytic Geometry", "General"] },
        { title: "Distance from a Point to a Line", eq: `$$d = \\frac{|Ax_1 + By_1 + C|}{\\sqrt{A^2 + B^2}}$$`, subtopics: ["Analytic Geometry"] },
        { title: "Angle Between Two Intersecting Lines", eq: `$$\\tan \\theta = \\left| \\frac{m_2 - m_1}{1 + m_1 m_2} \\right|$$`, subtopics: ["Analytic Geometry"] },
        { title: "Standard Equation of a Parabola (Vertical Axis)", eq: `$$(x - h)^2 = 4p(y - k)$$`, subtopics: ["Analytic Geometry"] },
        { title: "Standard Equation of an Ellipse (Horizontal Major Axis)", eq: `$$\\frac{(x - h)^2}{a^2} + \\frac{(y - k)^2}{b^2} = 1$$`, subtopics: ["Analytic Geometry"] },
        { title: "Standard Equation of a Hyperbola (Horizontal Transverse Axis)", eq: `$$\\frac{(x - h)^2}{a^2} - \\frac{(y - k)^2}{b^2} = 1$$`, subtopics: ["Analytic Geometry"] },

        // --- Probability & Statistics / Engineering Data Analytics ---
        { title: "Standard Normal Variable (Z-Score)", eq: `$$z = \\frac{x - \\mu}{\\sigma}$$`, subtopics: ["Probability & Statistics", "Engineering Data Analytics", "General"] },
        { title: "Combinations", eq: `$$C(n, r) = \\binom{n}{r} = \\frac{n!}{r!(n-r)!}$$`, subtopics: ["Probability & Statistics", "Engineering Data Analytics", "General"] },
        { title: "Permutations", eq: `$$P(n, r) = \\frac{n!}{(n-r)!}$$`, subtopics: ["Probability & Statistics", "Engineering Data Analytics", "General"] },
        { title: "Sample Mean", eq: `$$\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i$$`, subtopics: ["Probability & Statistics", "Engineering Data Analytics", "General"] },
        { title: "Sample Standard Deviation", eq: `$$s = \\sqrt{\\frac{\\sum_{i=1}^{n} (x_i - \\bar{x})^2}{n-1}}$$`, subtopics: ["Probability & Statistics", "Engineering Data Analytics", "General"] },
        { title: "Addition Rule of Probability", eq: `$$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$$`, subtopics: ["Probability & Statistics", "General"] },
        { title: "Conditional Probability", eq: `$$P(A|B) = \\frac{P(A \\cap B)}{P(B)}$$`, subtopics: ["Probability & Statistics"] },
        { title: "Bayes' Theorem", eq: `$$P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$$`, subtopics: ["Probability & Statistics"] },
        { title: "Binomial Probability Distribution", eq: `$$P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}$$`, subtopics: ["Probability & Statistics", "Engineering Data Analytics"] },
        { title: "Poisson Probability Distribution", eq: `$$P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}$$`, subtopics: ["Probability & Statistics", "Engineering Data Analytics"] },
        { title: "Simple Linear Regression (Slope)", eq: `$$b_1 = \\frac{n(\\sum xy) - (\\sum x)(\\sum y)}{n(\\sum x^2) - (\\sum x)^2}$$`, subtopics: ["Engineering Data Analytics"] },
        { title: "Pearson Correlation Coefficient", eq: `$$r = \\frac{n(\\sum xy) - (\\sum x)(\\sum y)}{\\sqrt{[n\\sum x^2 - (\\sum x)^2][n\\sum y^2 - (\\sum y)^2]}}$$`, subtopics: ["Engineering Data Analytics"] },
        { title: "Confidence Interval for the Mean (Large Sample)", eq: `$$\\bar{x} \\pm z_{\\alpha/2} \\left( \\frac{\\sigma}{\\sqrt{n}} \\right)$$`, subtopics: ["Engineering Data Analytics"] },

        // --- Calculus 1 ---
        { title: "Limit Definition of a Derivative", eq: `$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$`, subtopics: ["Calculus 1", "General"] },
        { title: "Power Rule (Differentiation)", eq: `$$\\frac{d}{dx} (x^n) = nx^{n-1}$$`, subtopics: ["Calculus 1", "General"] },
        { title: "Product Rule (Differentiation)", eq: `$$\\frac{d}{dx} [f(x)g(x)] = f(x)g'(x) + g(x)f'(x)$$`, subtopics: ["Calculus 1", "General"] },
        { title: "Derivative of a Quotient", eq: `$$\\frac{d}{dx} \\left[ \\frac{f(x)}{g(x)} \\right] = \\frac{g(x)f'(x) - f(x)g'(x)}{[g(x)]^2}$$`, subtopics: ["Calculus 1", "General"] },
        { title: "Chain Rule", eq: `$$\\frac{d}{dx} [f(g(x))] = f'(g(x))g'(x)$$`, subtopics: ["Calculus 1", "General"] },
        { title: "Derivative of Sine", eq: `$$\\frac{d}{dx} (\\sin x) = \\cos x$$`, subtopics: ["Calculus 1"] },
        { title: "Derivative of Cosine", eq: `$$\\frac{d}{dx} (\\cos x) = -\\sin x$$`, subtopics: ["Calculus 1"] },
        { title: "Derivative of Exponential Function", eq: `$$\\frac{d}{dx} (e^x) = e^x$$`, subtopics: ["Calculus 1", "General"] },
        { title: "Derivative of Natural Logarithm", eq: `$$\\frac{d}{dx} (\\ln x) = \\frac{1}{x}$$`, subtopics: ["Calculus 1", "General"] },
        { title: "L'Hôpital's Rule", eq: `$$\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}$$`, subtopics: ["Calculus 1"] },

        // --- Calculus 2 ---
        { title: "Integration by Parts", eq: `$$\\int u \\, dv = uv - \\int v \\, du$$`, subtopics: ["Calculus 2", "General"] },
        { title: "Euler's Formula", eq: `$$e^{i\\theta} = \\cos \\theta + i \\sin \\theta$$`, subtopics: ["Calculus 2", "Algebra & Complex Numbers", "General"] },
        { title: "Power Rule (Integration)", eq: `$$\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C, \\quad n \\neq -1$$`, subtopics: ["Calculus 2", "General"] },
        { title: "Fundamental Theorem of Calculus", eq: `$$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$$`, subtopics: ["Calculus 2", "General"] },
        { title: "Integral of 1/x", eq: `$$\\int \\frac{1}{x} \\, dx = \\ln |x| + C$$`, subtopics: ["Calculus 2", "General"] },
        { title: "Integral of Exponential Function", eq: `$$\\int e^x \\, dx = e^x + C$$`, subtopics: ["Calculus 2", "General"] },
        { title: "Area Between Two Curves", eq: `$$A = \\int_{a}^{b} [f(x) - g(x)] \\, dx$$`, subtopics: ["Calculus 2"] },
        { title: "Volume of a Solid of Revolution (Disk Method)", eq: `$$V = \\pi \\int_{a}^{b} [R(x)]^2 \\, dx$$`, subtopics: ["Calculus 2"] },
        { title: "Arc Length of a Curve", eq: `$$L = \\int_{a}^{b} \\sqrt{1 + \\left( \\frac{dy}{dx} \\right)^2} \\, dx$$`, subtopics: ["Calculus 2"] },
        { title: "Taylor Series", eq: `$$f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n$$`, subtopics: ["Calculus 2"] },

        // --- Differential Equations ---
        { title: "First-Order Linear Differential Equation", eq: `$$\\frac{dy}{dx} + P(x)y = Q(x)$$`, subtopics: ["Differential Equations", "General"] },
        { title: "Integrating Factor (First-Order Linear DE)", eq: `$$IF = e^{\\int P(x) \\, dx}$$`, subtopics: ["Differential Equations", "General"] },
        { title: "Separable Differential Equation", eq: `$$\\int f(y) \\, dy = \\int g(x) \\, dx + C$$`, subtopics: ["Differential Equations", "General"] },
        { title: "Exact Differential Equation Condition", eq: `$$\\frac{\\partial M}{\\partial y} = \\frac{\\partial N}{\\partial x}$$`, subtopics: ["Differential Equations"] },
        { title: "Bernoulli's Differential Equation", eq: `$$\\frac{dy}{dx} + P(x)y = Q(x)y^n$$`, subtopics: ["Differential Equations"] },
        { title: "Characteristic Equation (2nd Order Linear Homogeneous DE)", eq: `$$ar^2 + br + c = 0$$`, subtopics: ["Differential Equations", "General"] },
        { title: "General Solution (Distinct Real Roots)", eq: `$$y = C_1 e^{r_1 x} + C_2 e^{r_2 x}$$`, subtopics: ["Differential Equations"] },
        { title: "General Solution (Complex Roots)", eq: `$$y = e^{\\alpha x} (C_1 \\cos \\beta x + C_2 \\sin \\beta x)$$`, subtopics: ["Differential Equations"] },
        { title: "Exponential Growth and Decay Formula", eq: `$$y(t) = y_0 e^{kt}$$`, subtopics: ["Differential Equations", "General"] },
        { title: "Laplace Transform Definition", eq: `$$\\mathcal{L}\\{f(t)\\} = F(s) = \\int_{0}^{\\infty} e^{-st} f(t) \\, dt$$`, subtopics: ["Differential Equations", "General"] },

        // --- Numerical Methods & Analysis ---
        { title: "Newton-Raphson Method", eq: `$$x_{i+1} = x_i - \\frac{f(x_i)}{f'(x_i)}$$`, subtopics: ["Numerical Methods & Analysis", "General"] },
        { title: "Bisection Method", eq: `$$x_m = \\frac{x_a + x_b}{2}$$`, subtopics: ["Numerical Methods & Analysis", "General"] },
        { title: "Secant Method", eq: `$$x_{i+1} = x_i - \\frac{f(x_i)(x_i - x_{i-1})}{f(x_i) - f(x_{i-1})}$$`, subtopics: ["Numerical Methods & Analysis"] },
        { title: "Linear Interpolation", eq: `$$y = y_0 + (x - x_0)\\frac{y_1 - y_0}{x_1 - x_0}$$`, subtopics: ["Numerical Methods & Analysis", "General"] },
        { title: "Trapezoidal Rule (Multiple Segments)", eq: `$$I = \\frac{h}{2} \\left[ f(x_0) + 2 \\sum_{i=1}^{n-1} f(x_i) + f(x_n) \\right]$$`, subtopics: ["Numerical Methods & Analysis", "General"] },
        { title: "Simpson's 1/3 Rule (Multiple Segments)", eq: `$$I = \\frac{h}{3} \\left[ f(x_0) + 4 \\sum_{i=1,3,5...}^{n-1} f(x_i) + 2 \\sum_{j=2,4,6...}^{n-2} f(x_j) + f(x_n) \\right]$$`, subtopics: ["Numerical Methods & Analysis"] },
        { title: "Simpson's 3/8 Rule (Single Segment)", eq: `$$I = \\frac{3h}{8} [f(x_0) + 3f(x_1) + 3f(x_2) + f(x_3)]$$`, subtopics: ["Numerical Methods & Analysis"] },
        { title: "Euler's Method", eq: `$$y_{i+1} = y_i + f(x_i, y_i)h$$`, subtopics: ["Numerical Methods & Analysis", "General"] },
        { title: "Runge-Kutta 4th Order Method", eq: `$$y_{i+1} = y_i + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)$$`, subtopics: ["Numerical Methods & Analysis"] },
        { title: "Approximate Relative Error", eq: `$$\\epsilon_a = \\left| \\frac{x_{\\text{new}} - x_{\\text{old}}}{x_{\\text{new}}} \\right| \\times 100\\%$$`, subtopics: ["Numerical Methods & Analysis", "General"] }
    ],
    ESAS: [
        { title: "First Law of Thermodynamics", eq: `$$\\Delta U = Q - W$$`, subtopics: ["Basic Thermodynamics", "Physics for Engineers", "General"] },
        { title: "Ideal Gas Law", eq: `$$PV = nRT$$`, subtopics: ["Basic Thermodynamics", "Chemistry for Engineers", "General"] },
        { title: "Future Worth (Compound Interest)", eq: `$$F = P(1 + i)^n$$`, subtopics: ["Engineering Economics", "General"] },
        { title: "Capital Recovery Factor (Annuity)", eq: `$$A = P \\left[ \\frac{i(1+i)^n}{(1+i)^n - 1} \\right]$$`, subtopics: ["Engineering Economics"] },
        { title: "Bernoulli's Energy Equation", eq: `$$\\frac{P_1}{\\gamma} + \\frac{v_1^2}{2g} + z_1 = \\frac{P_2}{\\gamma} + \\frac{v_2^2}{2g} + z_2$$`, subtopics: ["Fluid Mechanics", "Physics for Engineers"] },
        { title: "Axial Deformation (Hooke's Law)", eq: `$$\\delta = \\frac{PL}{AE}$$`, subtopics: ["Fundamentals of Deformable Bodies", "Physics for Engineers", "General"] },
        { title: "Kinetic Energy", eq: `$$KE = \\frac{1}{2}mv^2$$`, subtopics: ["Physics for Engineers", "General"] },
        { title: "Straight Line Depreciation", eq: `$$d = \\frac{FC - SV}{n}$$`, subtopics: ["Engineering Economics"] },
        { title: "Present Worth of Perpetuity", eq: `$$P = \\frac{A}{i}$$`, subtopics: ["Engineering Economics"] },
        { title: "Newton's Second Law of Motion", eq: `$$F = m a$$`, subtopics: ["Physics for Engineers", "General"] },
        { title: "Work-Energy Theorem", eq: `$$W = \\Delta KE + \\Delta PE$$`, subtopics: ["Physics for Engineers", "General"] },
        { title: "Carnot Engine Efficiency", eq: `$$e = 1 - \\frac{T_C}{T_H}$$`, subtopics: ["Basic Thermodynamics", "Physics for Engineers"] },
        { title: "Continuity Equation (Fluids)", eq: `$$A_1 v_1 = A_2 v_2$$`, subtopics: ["Fluid Mechanics"] },
        { title: "Reynolds Number", eq: `$$Re = \\frac{\\rho v D}{\\mu}$$`, subtopics: ["Fluid Mechanics"] },
        { title: "Thermal Expansion (Linear)", eq: `$$\\Delta L = \\alpha L_0 \\Delta T$$`, subtopics: ["Physics for Engineers", "Material Science"] }
    ],
    EE: [
        { title: "Ohm's Law (Impedance)", eq: `$$V = I \\times Z$$`, subtopics: ["Electric Circuits 1", "Electric Circuits 2", "General"] },
        { title: "Complex Power", eq: `$$S = V I^* = P + jQ$$`, subtopics: ["Electric Circuits 2", "Power System Analysis", "General"] },
        { title: "Three-Phase Real Power", eq: `$$P = \\sqrt{3} V_L I_L \\cos \\theta$$`, subtopics: ["Electric Circuits 2", "Power System Analysis", "Power Plant Engineering", "General"] },
        { title: "Base Impedance (Per-Unit System)", eq: `$$Z_{base} = \\frac{(kV_{base})^2}{MVA_{base}}$$`, subtopics: ["Power System Analysis", "Distribution Systems & Substation Design"] },
        { title: "Per-Unit Value", eq: `$$Z_{pu} = \\frac{Z_{actual}}{Z_{base}}$$`, subtopics: ["Power System Analysis", "Electrical Machinery 1", "Distribution Systems & Substation Design"] },
        { title: "Transformer Turns Ratio", eq: `$$\\frac{V_1}{V_2} = \\frac{N_1}{N_2} = \\sqrt{\\frac{Z_1}{Z_2}}$$`, subtopics: ["Electrical Machinery 1", "General"] },
        { title: "Synchronous Motor Speed", eq: `$$N_s = \\frac{120 f}{P}$$`, subtopics: ["Electrical Machinery 2", "Power Plant Engineering", "General"] },
        { title: "Resonant Frequency", eq: `$$f_r = \\frac{1}{2\\pi\\sqrt{LC}}$$`, subtopics: ["Electric Circuits 2", "Fundamentals of Electronic Communications", "General"] },
        { title: "Voltage Regulation", eq: `$$\\%VR = \\frac{|V_{NL}| - |V_{FL}|}{|V_{FL}|} \\times 100$$`, subtopics: ["Power System Analysis", "Electrical Machinery 1", "Distribution Systems & Substation Design"] },
        { title: "Voltage Divider Rule", eq: `$$V_x = V_s \\frac{R_x}{R_{eq}}$$`, subtopics: ["Electric Circuits 1", "General"] },
        { title: "Current Divider Rule (2 Resistors)", eq: `$$I_1 = I_t \\frac{R_2}{R_1 + R_2}$$`, subtopics: ["Electric Circuits 1", "General"] },
        { title: "Maximum Power Transfer", eq: `$$P_{max} = \\frac{V_{th}^2}{4R_{th}}$$`, subtopics: ["Electric Circuits 1", "Electric Circuits 2"] },
        { title: "Delta to Wye Transformation", eq: `$$R_a = \\frac{R_{ab} R_{ca}}{R_{ab} + R_{bc} + R_{ca}}$$`, subtopics: ["Electric Circuits 1", "Power System Analysis"] },
        { title: "Slip of an Induction Motor", eq: `$$s = \\frac{N_s - N_r}{N_s}$$`, subtopics: ["Electrical Machinery 2", "Power Plant Engineering"] },
        { title: "Transformer Efficiency", eq: `$$\\eta = \\frac{P_{out}}{P_{out} + P_{core} + I^2R_{cu}}$$`, subtopics: ["Electrical Machinery 1"] },
        { title: "Illuminance (Inverse Square Law)", eq: `$$E = \\frac{I}{d^2} \\cos \\theta$$`, subtopics: ["Electrical System & Illumination Design"] },
        { title: "Symmetrical Components (Zero Sequence)", eq: `$$I_{a0} = \\frac{1}{3}(I_a + I_b + I_c)$$`, subtopics: ["Power System Analysis"] },
        { title: "Fault Level (MVA Method)", eq: `$$MVA_{fault} = \\frac{MVA_{base}}{Z_{pu}}$$`, subtopics: ["Power System Analysis", "Distribution Systems & Substation Design"] }
    ]
};

export default function ReferenceHub() {
    // 🚀 FIXED: Replaced static TOS with dynamicTOS from the global store
    const { dynamicTOS } = useStore();
    const safeTOS = dynamicTOS || {};

    const [matrixSubject, setMatrixSubject] = useState('EE');
    const [activeSubtopic, setActiveSubtopic] = useState('All');

    const handleSubjectChange = (subj) => {
        setMatrixSubject(subj);
        setActiveSubtopic('All');
    };

    const displayedFormulas = OFFLINE_FORMULAS[matrixSubject]?.filter(f => 
        activeSubtopic === 'All' || f.subtopics.includes(activeSubtopic)
    ) || [];

    return (
        <div className="animate-in fade-in flex flex-col gap-5">
            <div className="flex gap-2">
                {['Mathematics', 'ESAS', 'EE'].map(subj => (
                    <button 
                        key={subj}
                        onClick={() => handleSubjectChange(subj)} 
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${matrixSubject === subj ? 'bg-reeCyan text-bg shadow-[0_0_12px_rgba(6,182,212,0.5)]' : 'bg-surface2 hover:bg-surface3 text-textMain border border-border2'}`}>
                        {subj}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-border2/50 pb-4 mt-2">
                <div className="flex gap-2 shrink-0">
                    <button 
                        onClick={() => setActiveSubtopic('All')}
                        className={`px-4 py-2 rounded-lg text-[0.65rem] uppercase tracking-wider font-bold transition-colors cursor-pointer ${activeSubtopic === 'All' ? 'bg-surface3 border-reeCyan text-reeCyan border' : 'bg-bg border border-border2 text-muted hover:text-textMain'}`}>
                        All
                    </button>
                    <button 
                        onClick={() => setActiveSubtopic('General')}
                        className={`px-4 py-2 rounded-lg text-[0.65rem] uppercase tracking-wider font-bold transition-colors cursor-pointer ${activeSubtopic === 'General' ? 'bg-surface3 border-reeCyan text-reeCyan border' : 'bg-bg border border-border2 text-muted hover:text-textMain'}`}>
                        General
                    </button>
                </div>
                <div className="hidden sm:block h-6 w-px bg-border2 shrink-0"></div>
                <select 
                    value={['All', 'General'].includes(activeSubtopic) ? "" : activeSubtopic}
                    onChange={(e) => { if(e.target.value) setActiveSubtopic(e.target.value); }}
                    className="flex-1 bg-bg border border-border2 text-textMain p-2 rounded-md text-xs font-bold outline-none focus:border-reeCyan cursor-pointer min-w-[200px] transition-colors"
                >
                    <option value="" disabled>Select a specific subtopic to filter...</option>
                    {/* 🚀 FIXED: Used global safeTOS to render dynamic subtopics */}
                    {(safeTOS[matrixSubject] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
            </div>
            
            {displayedFormulas.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border2 rounded-xl text-muted2 text-xs font-mono">
                    No offline formulas registered for "{activeSubtopic}" yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {displayedFormulas.map((formula, idx) => (
                        <div key={idx} className="p-5 bg-surface border border-border2 rounded-xl shadow-sm hover:border-reeCyan/40 transition-colors flex flex-col h-full overflow-hidden">
                            <div className="text-[0.65rem] text-muted2 uppercase tracking-widest font-bold mb-3 border-b border-border2 pb-2 leading-relaxed" title={formula.title}>
                                {formula.title}
                            </div>
                            
                            <div className="w-full overflow-x-auto math-scroll-mobile pb-4 flex-1 flex items-center">
                                <div className="w-max mx-auto px-2 text-textMain">
                                    <LatexRenderer content={formula.eq} />
                                </div>
                            </div>
                            
                            {activeSubtopic === 'All' && (
                                <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-border2/30">
                                    {formula.subtopics.map(t => (
                                        <span key={t} className={`text-[0.6rem] px-2 py-0.5 rounded border ${t === 'General' ? 'bg-reeCyan/10 border-reeCyan/30 text-reeCyan font-bold tracking-widest uppercase' : 'bg-surface2 border-border2 text-muted2 font-medium'}`}>
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}