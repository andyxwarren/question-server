/**
 * Answer Validator
 * Handles validation of user answers against correct answers
 */

class AnswerValidator {
    /**
     * Validates user answer against correct answer
     * @param {string} userAnswer - The user's input
     * @param {string} correctAnswer - The correct answer
     * @param {string} answerType - Type of answer (numeric, text, single_choice, multi_part)
     * @returns {boolean} - True if answer is correct
     */
    static validate(userAnswer, correctAnswer, answerType) {
        if (!userAnswer || userAnswer.trim() === '') {
            return false;
        }

        switch (answerType) {
            case 'numeric':
                return this.validateNumeric(userAnswer, correctAnswer);
            case 'text':
                return this.validateText(userAnswer, correctAnswer);
            case 'single_choice':
                return this.validateSingleChoice(userAnswer, correctAnswer);
            case 'multi_part':
                return this.validateMultiPart(userAnswer, correctAnswer);
            default:
                // Default to text comparison
                return this.validateText(userAnswer, correctAnswer);
        }
    }

    /**
     * Validates numeric answers
     * @param {string} userAnswer
     * @param {string} correctAnswer
     * @returns {boolean}
     */
    static validateNumeric(userAnswer, correctAnswer) {
        const userNum = parseFloat(userAnswer.trim());
        const correctNum = parseFloat(correctAnswer);

        if (isNaN(userNum) || isNaN(correctNum)) {
            return false;
        }

        // Check equality with small tolerance for floating point errors
        return Math.abs(userNum - correctNum) < 0.0001;
    }

    /**
     * Validates text answers (case-insensitive, whitespace normalized)
     * @param {string} userAnswer
     * @param {string} correctAnswer
     * @returns {boolean}
     */
    static validateText(userAnswer, correctAnswer) {
        const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, ' ');
        return normalize(userAnswer) === normalize(correctAnswer);
    }

    /**
     * Validates single choice answers (exact match)
     * @param {string} userAnswer
     * @param {string} correctAnswer
     * @returns {boolean}
     */
    static validateSingleChoice(userAnswer, correctAnswer) {
        return userAnswer.trim() === correctAnswer.trim();
    }

    /**
     * Validates multi-part answers (comma-separated)
     * @param {string} userAnswer
     * @param {string} correctAnswer
     * @returns {boolean}
     */
    static validateMultiPart(userAnswer, correctAnswer) {
        const userParts = userAnswer.split(',').map(p => p.trim());
        const correctParts = correctAnswer.split(',').map(p => p.trim());

        if (userParts.length !== correctParts.length) {
            return false;
        }

        return userParts.every((part, index) => {
            return part.toLowerCase() === correctParts[index].toLowerCase();
        });
    }
}
