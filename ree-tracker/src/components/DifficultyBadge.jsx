import React from 'react';

export default function DifficultyBadge({ difficulty }) {
    const getDifficultyConfig = (diff) => {
        switch(diff) {
            case 1:
                return { label: 'Easy', classes: 'bg-reeGreen/15 text-reeGreen border-reeGreen/25' };
            case 3:
                return { label: 'Hard', classes: 'bg-reeRed/15 text-reeRed border-reeRed/25' };
            case 2:
            default:
                return { label: 'Medium', classes: 'bg-reeAmber/15 text-reeAmber border-reeAmber/25' };
        }
    };

    const config = getDifficultyConfig(difficulty);

    return (
        <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border ${config.classes}`}>
            {config.label}
        </span>
    );
}