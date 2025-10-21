# Question Practice App - MVP

A simple, browser-based application for practicing mathematics questions from JSON exports.

## Features

This app includes:
- ✅ Auto-loads questions from `questions/questions.json`
- ✅ JSON file upload and validation (manual fallback)
- ✅ **Text input questions** with answer field
- ✅ **Multiple choice questions** with clickable buttons
- ✅ Answer validation (numeric, text, and single choice types)
- ✅ Immediate feedback (correct/incorrect with green ✓ or red ✗)
- ✅ Question navigation (next/previous)
- ✅ Progress tracking (Question X of Y)
- ✅ Results summary with score percentage
- ✅ Clean, student-friendly interface
- ✅ Responsive design (works on tablets and desktops)

## Quick Start

### Option 1: Auto-Load Questions (Recommended)

1. **Place your questions file** in the `questions` folder:
   ```
   question-server/
   └── questions/
       └── questions.json  ← Your questions file here
   ```

2. **Start the local server**:
   ```bash
   python custom_server.py
   ```

   The server will start and display:
   ```
   Server running at http://localhost:8000
   Then open: http://localhost:8000
   Press Ctrl+C to stop the server
   ```

3. **Open your browser** to `http://localhost:8000`

4. The app will automatically load your questions - click "Start Questions" to begin!

**Alternative methods:**
- **Windows**: Double-click `start-server.bat` (auto-opens browser)
- **Mac/Linux**: Run `./start-server.sh` in terminal (auto-opens browser)

### Option 2: Manual Upload

1. Start the local server (see above)
2. Open the app in your browser
3. Click "Upload Question JSON File" and select your `questions.json` file
4. Click "Start Questions" to begin

### Why a Local Server?

Due to browser security (CORS policy), you need to run a simple local web server to auto-load the questions file. The `custom_server.py` script provides a simple cross-platform solution.

**Requirements**: Python 3 must be installed on your system. Download from [python.org](https://www.python.org/downloads/) if needed.

## Using the App

1. **Answer questions**:
   - Read each question
   - Type your answer in the input field
   - Click "Submit Answer" or press Enter
   - See immediate feedback (✓ for correct, ✗ for incorrect)

2. **Navigate**:
   - Use "Next" to move forward
   - Use "Previous" to review earlier questions
   - Your answers are saved as you go

3. **View results**: After the last question, click "Finish" to see your score

4. **Start over**: Click "Start Over" to reload the questions and try again

## File Structure

```
question-server/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── app.js              # Main application logic
├── validator.js        # Answer validation
├── custom_server.py    # Python HTTP server (recommended)
├── start-server.bat    # Windows server launcher (alternative)
├── start-server.sh     # Mac/Linux server launcher (alternative)
├── README.md           # This file
└── questions/          # Place your questions.json here
    └── questions.json  # Your question data (auto-loaded)
```

## Supported Question Types

- **Text input questions** - Plain text questions with text input field
- **Multiple choice questions** - Questions with clickable option buttons
- **Numeric answers** - Automatic parsing with decimal support
- **Text answers** - Case-insensitive, whitespace normalized
- **Single choice validation** - For multiple choice questions

## Future Enhancements

- Fill-in-the-blanks with multiple input fields (multi-part answers)
- Multi-part answers (comma-separated)
- Columnar calculations (vertical arithmetic)
- Filtering by module, year group, difficulty
- Sorting options
- Detailed results breakdown by difficulty level
- Keyboard shortcuts
- Question review functionality

## Technical Details

- **Local server required** - simple Python HTTP server (included scripts)
- **No build process** - just start the server and go
- **Pure JavaScript** - no frameworks or libraries
- **Modern browser required** - uses ES6+ features
- **Auto-loads questions** - from `questions/questions.json` on startup
- **Fallback manual upload** - if auto-load fails, you can still upload files

## Browser Compatibility

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Testing

To test the app, use a JSON file exported from the UK Maths Practice Application with the following structure:

```json
{
  "metadata": {
    "exportDate": "2025-01-20T10:00:00Z",
    "version": "1.0",
    "generatorVersion": "1.0",
    "questionCount": 10,
    "moduleCount": 1
  },
  "questions": [
    {
      "id": "q1",
      "questionNumber": 1,
      "moduleId": "N01_Y1_NPV",
      "moduleName": "Counting in multiples",
      "yearGroup": "Year 1",
      "level": 1,
      "levelName": "Beginning",
      "difficultyScore": 25,
      "questionType": "text_input",
      "questionText": "What is 5 + 3?",
      "visualType": "plain_text",
      "correctAnswer": "8",
      "answerType": "numeric"
    }
  ]
}
```

## Troubleshooting

**CORS error / "Failed to fetch"**: You're opening `index.html` directly (file:// protocol). Start the server instead:
```bash
python custom_server.py
```

**Python not found**: Install Python 3 from [python.org](https://www.python.org/downloads/) and restart your terminal/command prompt

**Port 8000 already in use (OSError: [WinError 10048])**:
1. Find the process using the port:
   ```bash
   netstat -ano | findstr :8000
   ```
2. Kill the process (replace `<PID>` with the process ID):
   ```bash
   taskkill /PID <PID> /F
   ```
   Or edit `custom_server.py` and change `PORT = 8000` to a different port like `8080`

**File won't upload**: Ensure the file is valid JSON and has `.json` extension

**Questions don't display**: Check browser console (F12) for errors

**Validation not working**: Ensure the JSON has `correctAnswer` and `answerType` fields

## License

This is a simple educational tool. Use freely for practice and learning.
