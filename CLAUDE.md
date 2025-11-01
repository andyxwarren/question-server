# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based mathematics question practice application that loads questions from JSON exports. The app features an on-screen keyboard for numeric input, multiple choice support, immediate feedback, and progress tracking. Built with vanilla JavaScript, no frameworks or build tools.

## Development Commands

### Running the Application

```bash
# Start the local HTTP server (required for CORS)
python custom_server.py
```

The server runs on `http://localhost:8000` by default. Opening `index.html` directly will fail due to browser CORS restrictions when fetching `questions/questions.json`.

### Port Conflicts

If port 8000 is in use:

```bash
# Windows: Find and kill the process
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Alternative: Edit custom_server.py and change PORT = 8000 to another port
```

## Architecture

### Core Components

**QuestionApp (app.js)** - Main application class that manages the entire question flow:
- Auto-loads `questions/questions.json` on startup (with fallback to manual upload)
- Manages application state: `questions[]`, `userAnswers` Map, `currentIndex`
- Handles three main views: upload section, question section, results section
- Orchestrates question rendering (text input vs multiple choice)
- Controls on-screen keyboard visibility based on question type

**AnswerValidator (validator.js)** - Static validation class with type-specific validators:
- `validateNumeric()`: Parses floats with 0.0001 tolerance for floating point errors
- `validateText()`: Case-insensitive, whitespace-normalized comparison
- `validateSingleChoice()`: Exact match for multiple choice selections
- `validateMultiPart()`: Comma-separated validation (not yet used in UI)

### Question Flow

1. **Auto-load**: Fetch `questions/questions.json` via `autoLoadQuestions()`
2. **Display metadata**: Show question count, module count, export date
3. **Start questions**: Click "Start Questions" → `startQuestions()`
4. **Question loop**:
   - `displayQuestion()` renders current question
   - For `questionType === 'multiple_choice'`: Render option buttons, hide keyboard
   - For `questionType === 'text_input'`: Show readonly input + on-screen keyboard
   - `submitAnswer()` validates via `AnswerValidator.validate()`
   - Store result in `userAnswers` Map (questionId → {answer, isCorrect})
   - Navigate with Previous/Next buttons
5. **Results**: After last question, `showResults()` calculates percentage and displays summary

### On-Screen Keyboard

- Only shown for `text_input` questions (hidden for multiple choice)
- Keyboard display shows current value; answer input is readonly
- Supports: numeric input (0-9), decimal point, clear, backspace, negative toggle
- `handleKeyboardInput()` updates display and syncs to `answerInput.value`
- Disabled after answer submission (checked via `hasSubmittedCurrent` flag)

### State Management

The app uses simple class properties without external state libraries:
- `questions`: Array of question objects from JSON
- `userAnswers`: Map<questionId, {answer: string, isCorrect: boolean}>
- `currentIndex`: Current question index (0-based)
- `hasSubmittedCurrent`: Boolean flag preventing re-submission
- `selectedOption`: Tracks current multiple choice selection

### Question Data Structure

Questions are loaded from `questions/questions.json`:

```json
{
  "metadata": {
    "exportDate": "ISO-8601 timestamp",
    "questionCount": 100,
    "moduleCount": 5
  },
  "questions": [
    {
      "id": "unique_id",
      "questionNumber": 1,
      "moduleId": "N01_Y1_NPV",
      "moduleName": "Counting in Multiples",
      "yearGroup": "Year 1",
      "level": 1,
      "levelName": "Beginning",
      "difficultyScore": 20,
      "questionType": "multiple_choice" | "text_input",
      "questionText": "Question prompt",
      "correctAnswer": "8",
      "answerType": "numeric" | "text" | "single_choice" | "multi_part",
      "multipleChoiceOptions": [10, 9, 8, 6]  // only for multiple_choice type
    }
  ]
}
```

### Event Flow

- File upload → `handleFileUpload()` → parse JSON → `displayMetadata()`
- Start button → `startQuestions()` → show question section
- Submit answer → `submitAnswer()` → `AnswerValidator.validate()` → `showFeedback()` → store in `userAnswers`
- Navigation buttons → `nextQuestion()` / `previousQuestion()` → `displayQuestion()`
- Finish (on last question) → `showResults()` → calculate score → show results section
- Restart → `restart()` → clear state → `autoLoadQuestions()` again

### Notification System

Global notification component (`notification` div) with auto-hide:
- `showNotification(message, type, duration)` - Types: 'error', 'warning', 'success', 'info'
- Displays at top of page with fade-in animation
- Auto-hides after specified duration (default 4000ms)
- Used for validation feedback, correct/incorrect answers

## File Structure

```
question-server/
├── index.html              # Main HTML structure (upload, question, results sections)
├── styles.css              # All styling (keyboard, cards, feedback, responsive)
├── app.js                  # QuestionApp class (main application logic)
├── validator.js            # AnswerValidator class (answer validation)
├── custom_server.py        # Python HTTP server for local development
├── questions/
│   └── questions.json      # Question data (auto-loaded on startup)
└── README.md               # User documentation
```

## Key Constraints

- **No build process**: Pure JavaScript, no transpilation or bundling
- **CORS requirement**: Must run via HTTP server (cannot use file:// protocol)
- **Browser compatibility**: Uses ES6+ features (Map, arrow functions, async/await)
- **Readonly input**: Answer input field is readonly; keyboard/buttons control input
- **Single submission**: Each question can only be submitted once (enforced by `hasSubmittedCurrent`)

## Common Modifications

### Adding a new answer type

1. Add validator method to `AnswerValidator` class in `validator.js`
2. Update switch statement in `AnswerValidator.validate()`
3. Modify UI rendering in `displayQuestion()` if special input needed

### Changing keyboard layout

- Edit HTML in `index.html` at `<div id="on-screen-keyboard">`
- Update event handlers in `attachKeyboardListeners()` and `handleKeyboardInput()`

### Modifying question rendering

- For multiple choice: Update `renderMultipleChoice()` in app.js:401
- For text input: Update `renderTextInput()` in app.js:382
- Question metadata tags rendered in `displayQuestion()` at app.js:337
