// src/features/library/ManualIngestionForm.jsx
import { useStore } from '../../store/useStore';
import { Button, FormField, Select, Input, Textarea } from '../../components/ui';

export default function ManualIngestionForm({
    manualQ, setManualQ,
    genSubject, setGenSubject,
    genSubtopic, setGenSubtopic,
    handleManualSubmit
}) {
    // 🚀 Connect the dropdowns directly to the cloud-synced Dynamic TOS
    const { dynamicTOS } = useStore();

    // Safety fallback in case the store hasn't populated yet
    const safeTOS = dynamicTOS || {};

    return (
        <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-6 shadow-sm animate-in fade-in">
            <h3 className="text-lg font-semibold text-textMain tracking-tight mb-6">
                Add a question manually
            </h3>

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-5">
                {/* Subject and subtopic */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Subject">
                        <Select
                            value={genSubject}
                            onChange={e => {
                                setGenSubject(e.target.value);
                                setGenSubtopic(safeTOS[e.target.value]?.[0] || '');
                            }}
                        >
                            {Object.keys(safeTOS).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Topic">
                        <Select value={genSubtopic} onChange={e => setGenSubtopic(e.target.value)}>
                            {(safeTOS[genSubject] || []).map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                    </FormField>
                </div>

                {/* Type + difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Question type">
                        <Select
                            value={manualQ.type || 'calculation'}
                            onChange={e => setManualQ({ ...manualQ, type: e.target.value })}
                        >
                            <option value="calculation">Calculation (heavy math)</option>
                            <option value="conceptual">Conceptual (theory)</option>
                        </Select>
                    </FormField>
                    <FormField label="Difficulty">
                        <Select
                            value={manualQ.difficulty || '2'}
                            onChange={e => setManualQ({ ...manualQ, difficulty: e.target.value })}
                        >
                            <option value="1">1 — Foundation (easy)</option>
                            <option value="2">2 — Core (medium)</option>
                            <option value="3">3 — Advanced (hard)</option>
                        </Select>
                    </FormField>
                </div>

                {/* Question text */}
                <FormField label="Question text" required>
                    <Textarea
                        required
                        value={manualQ.text || ''}
                        onChange={e => setManualQ({ ...manualQ, text: e.target.value })}
                        className="min-h-[100px] leading-relaxed custom-scrollbar"
                        placeholder="Enter the complete question text…"
                    />
                </FormField>

                {/* Correct answer — success-tinted border is semantic (this IS the key) */}
                <FormField label="Correct answer" required>
                    <Input
                        required
                        value={manualQ.answer || ''}
                        onChange={e => setManualQ({ ...manualQ, answer: e.target.value })}
                        placeholder="The exact correct value or statement"
                        style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }}
                    />
                </FormField>

                {/* Distractors — danger-tinted borders are semantic (wrong options) */}
                <FormField label="Wrong options (distractors)" required>
                    {({ id }) => (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[1, 2, 3].map((n) => (
                                <Input
                                    key={n}
                                    id={n === 1 ? id : undefined}
                                    required
                                    value={manualQ[`distractor${n}`] || ''}
                                    onChange={e => setManualQ({ ...manualQ, [`distractor${n}`]: e.target.value })}
                                    placeholder={`Wrong option ${n}`}
                                    aria-label={`Wrong option ${n}`}
                                    style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 20%, transparent)' }}
                                />
                            ))}
                        </div>
                    )}
                </FormField>

                {/* Explanation */}
                <FormField label="Solution / explanation" hint="Optional — shown as the offline solution after answering.">
                    <Textarea
                        value={manualQ.fixedExplanation || ''}
                        onChange={e => setManualQ({ ...manualQ, fixedExplanation: e.target.value })}
                        className="min-h-[100px] leading-relaxed custom-scrollbar"
                        placeholder="Step-by-step derivation or conceptual context…"
                    />
                </FormField>

                <div className="pt-4 border-t border-border mt-2">
                    <Button type="submit" fullWidth>
                        Add to vault
                    </Button>
                </div>
            </form>
        </div>
    );
}
