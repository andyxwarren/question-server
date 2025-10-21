# Prompt: Build a Question Display Application

## Context

I have a JSON export file from a UK Maths Practice application that contains curriculum-aligned mathematics questions here: questions\questions.json. I need to build a simple web application that reads this JSON data and displays questions to students with proper rendering and answer validation.

The complete specification for the data format is available in the document "UK Maths Practice Application - Core Features & Export Specification" which details all fields, their meanings, and how they're used.

## Requirements

### Technical Stack
- **HTML5** for structure
- **CSS3** for styling (modern features like Grid, Flexbox)
- **Vanilla JavaScript** (ES6+) - NO frameworks or libraries
- **No build process** - should run directly in browser
- **No backend** - entirely client-side

### Core Features Required

1. **JSON File Upload**
   - Allow users to upload/select the exported JSON file
   - Parse and validate the JSON structure
   - Display metadata (export date, question count, module count)

2. **Question Display**
   - Show questions one at a time
   - Render according to the `visualType` field:
     - `plain_text` - Simple text display
     - `multiple_choice` - Show options as clickable buttons
     - `text_input` - Show input field for answers
     - `fill_blanks` - Show input fields for each gap
     - `columnar_calculation` - Render vertical arithmetic (parse from questionData)
     - `formatted_text` - Preserve spacing and alignment
   - Display question metadata: module name, year group, difficulty level
   - Show question number and total count

3. **Answer Input & Validation**
   - Provide appropriate input interface based on `questionType`:
     - Text input for `text_input` type
     - Radio buttons or clickable options for `multiple_choice`
     - Multiple input fields for `fill_blanks`
   - "Submit Answer" button
   - Compare student input to `correctAnswer` field
   - Apply validation based on `answerType`:
     - `numeric` - parse as number, check equality (handle decimals)
     - `text` - normalize whitespace/case, check equality
     - `single_choice` - check if selected option matches
     - `multi_part` - split by comma, validate each part
   - Show immediate feedback (correct ✓ or incorrect ✗)
   - Display correct answer when wrong
   - Optionally show hint if available

4. **Navigation**
   - "Next Question" button
   - "Previous Question" button (to review)
   - Progress indicator (e.g., "Question 5 of 20")
   - Ability to jump to specific questions
   - Mark questions as answered/unanswered

5. **Filtering & Sorting**
   - Filter by:
     - Module ID
     - Year Group
     - Difficulty Level (1-4)
     - Strand
   - Sort by:
     - Question number (default)
     - Difficulty score
     - Module ID

6. **Results Summary**
   - Track correct/incorrect answers
   - Show overall score (e.g., "15/20 - 75%")
   - Break down by difficulty level
   - Show which questions were answered correctly/incorrectly
   - Allow reviewing incorrect answers

## Data Structure Reference

The JSON file has this structure:

```json
{
  "metadata": {
    "exportDate": "ISO timestamp",
    "version": "1.0",
    "generatorVersion": "1.0",
    "questionCount": 20,
    "moduleCount": 1
  },
  "questions": [
    {
      "id": "unique-id",
      "questionNumber": 1,
      "moduleId": "N01_Y1_NPV",
      "moduleName": "Counting in multiples",
      "yearGroup": "Year 1",
      "level": 1,
      "levelName": "Beginning",
      "difficultyScore": 25,
      "questionType": "text_input" | "multiple_choice" | "fill_blanks",
      "questionText": "Plain text question",
      "visualType": "plain_text" | "columnar_calculation" | "multiple_choice" | ...,
      "questionData": { /* structured data for reconstruction */ },
      "correctAnswer": "answer as string",
      "answerType": "numeric" | "text" | "single_choice" | "multi_part",
      "multipleChoiceOptions": [15, 5, 20, 10] | null,
      "hint": "Optional hint text" | null,
      "multiGapAnswers": ["answer1", "answer2"] | null,
      "generatorParameters": { /* parameters used for generation */ },
      "tags": ["tag1", "tag2", ...],
      "generatedAt": "ISO timestamp"
    }
  ]
}
```

## Specific Implementation Guidance

### File Structure
```
question-viewer/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── app.js              # Main application logic
├── questionRenderer.js # Question rendering logic
├── validator.js        # Answer validation logic
└── README.md          # Instructions for use
```

### Key JavaScript Modules/Classes Needed

1. **App Controller** (`app.js`)
   - Handle file upload
   - Store question data
   - Manage current question index
   - Track user answers and results
   - Handle navigation
   - Coordinate between renderer and validator

2. **Question Renderer** (`questionRenderer.js`)
   - Take question object as input
   - Determine rendering strategy based on visualType
   - Generate appropriate HTML elements
   - Special renderers for:
     - Columnar calculations (vertical layout)
     - Multiple choice (option buttons)
     - Fill blanks (multiple inputs)

3. **Answer Validator** (`validator.js`)
   - Take user input and question object
   - Apply appropriate validation based on answerType
   - Return validation result (correct/incorrect)
   - Handle edge cases (whitespace, case sensitivity, number formatting)

### UI/UX Considerations

- **Clean, student-friendly interface**
- **Large, readable fonts** (minimum 16px for body text, 20px+ for questions)
- **Clear visual feedback** for correct/incorrect answers
  - Green checkmark for correct
  - Red X for incorrect with correct answer shown
- **Accessible colors** (good contrast ratios)
- **Responsive design** (works on tablets and desktops)
- **Keyboard navigation support** (Enter to submit, arrows to navigate)

### Visual Design Suggestions

- **Card-based layout** for questions (centered, with shadow/border)
- **Progress bar** showing completion
- **Color coding** for difficulty levels:
  - Level 1 (Beginning): Light green
  - Level 2 (Developing): Light blue  
  - Level 3 (Meeting): Light orange
  - Level 4 (Exceeding): Light purple
- **Clear sections**: Header (metadata), Question Area, Answer Area, Navigation
- **Minimal distractions** - focus on the question content

### Special Rendering Cases

#### Columnar Calculations
Parse `questionData` when `visualType === "columnar_calculation"`:
```javascript
// questionData.type === "columnar"
// questionData.numbers = [523, 287]
// questionData.operator = "+"

// Render as:
//     523
//   + 287
//   -----
//     ???
```

#### Fill Blanks Questions
When `questionType === "fill_blanks"`:
- Parse question text for placeholders (?) or gaps
- Create input field for each gap
- Use `multiGapAnswers` array for validation
- Allow tab navigation between gaps

#### Multiple Choice
When `questionType === "multiple_choice"`:
- Display `multipleChoiceOptions` as large, clickable buttons
- Highlight selected option
- Validate against `correctAnswer`

### Example User Flow

1. User loads page → See upload interface
2. User uploads JSON file → Parse and show metadata
3. User clicks "Start Questions" → Display first question
4. User reads question → Enters answer → Clicks "Submit"
5. System validates → Shows feedback (correct/incorrect)
6. User clicks "Next" → Load next question
7. Repeat until all questions answered
8. Show results summary with score breakdown

## Success Criteria

The application should:
- ✅ Successfully parse and load JSON exports
- ✅ Display questions with correct formatting based on visualType
- ✅ Accept user answers through appropriate interfaces
- ✅ Accurately validate answers according to answerType
- ✅ Provide clear visual feedback on correctness
- ✅ Allow navigation between questions
- ✅ Filter and sort questions by various criteria
- ✅ Display comprehensive results at the end
- ✅ Work entirely in the browser without a server
- ✅ Have a clean, student-friendly interface
- ✅ Be maintainable and well-commented

## Additional Notes

- Start with the simplest features first (upload, display, basic validation)
- Build complexity gradually (special rendering, filtering, advanced features)
- Test with actual export JSON from the UK Maths Practice application
- Focus on making the question display clear and the validation accurate
- Keep the code modular and well-organized
- Use modern JavaScript features (arrow functions, template literals, async/await)
- Add helpful console logs for debugging
- Include error handling for malformed JSON or missing fields

## Sample Starter Code Structure

```javascript
// app.js
class QuestionApp {
  constructor() {
    this.questions = [];
    this.currentIndex = 0;
    this.userAnswers = new Map();
    this.results = new Map();
  }
  
  async loadJSON(file) { /* ... */ }
  displayQuestion(index) { /* ... */ }
  submitAnswer() { /* ... */ }
  nextQuestion() { /* ... */ }
  previousQuestion() { /* ... */ }
  showResults() { /* ... */ }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new QuestionApp();
  app.init();
});
```

Please build this application following these specifications, keeping it simple, clean, and focused on displaying questions effectively and validating answers accurately.