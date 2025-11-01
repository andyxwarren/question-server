# Question Server - Feature Summary

## Overview

Question Server is a browser-based mathematics practice application designed for students to work through question sets exported from JSON files. The application provides an interactive, student-friendly interface with immediate feedback and progress tracking.

## Core Features

### Question Loading & Management

- **Auto-load Questions**: Automatically fetches questions from `questions/questions.json` on startup
- **Manual Upload Fallback**: If auto-load fails, users can manually upload a JSON file
- **Metadata Display**: Shows export date, total question count, and module count before starting
- **JSON Validation**: Validates uploaded files to ensure correct structure before loading

### Question Types Supported

1. **Text Input Questions**
   - Plain text questions with numeric or text answers
   - Readonly input field controlled by on-screen keyboard
   - Supports decimal numbers and negative values

2. **Multiple Choice Questions**
   - Visual option buttons for each choice
   - Single selection mode
   - Clear visual feedback for selected option

### On-Screen Keyboard

- **Numeric Input**: Full 0-9 number pad layout
- **Decimal Support**: Decimal point button for non-integer answers
- **Operations**:
  - Clear (C): Reset input to zero
  - Backspace (⌫): Delete last digit
  - Negative (+/-): Toggle positive/negative
- **Visual Display**: Shows current value above keyboard
- **Smart Visibility**: Automatically shown for text input, hidden for multiple choice
- **Submit Protection**: Disabled after answer submission to prevent changes

### Answer Validation

The application supports multiple validation types:

1. **Numeric Validation**
   - Parses numeric answers with floating-point support
   - Uses tolerance of 0.0001 for floating-point comparison
   - Handles integers and decimals

2. **Text Validation**
   - Case-insensitive comparison
   - Whitespace normalization (trims and collapses multiple spaces)
   - Flexible for text-based answers

3. **Single Choice Validation**
   - Exact match validation for multiple choice selections
   - Ensures selected option matches correct answer

4. **Multi-Part Validation** (prepared for future use)
   - Comma-separated answer support
   - Order-sensitive validation

### Interactive Feedback

- **Immediate Validation**: Instant feedback after submission
- **Visual Indicators**:
  - Green checkmark (✓) for correct answers
  - Red cross (✗) for incorrect answers
- **Correct Answer Display**: Shows the correct answer when user is wrong
- **Notification System**:
  - Success notifications for correct answers
  - Error notifications with correct answer for incorrect responses
  - Warning notifications for validation errors
  - Auto-dismiss after specified duration

### Navigation & Progress

- **Progress Indicator**: "Question X of Y" display at top
- **Previous Button**: Review earlier questions (disabled on first question)
- **Next Button**: Advance to next question (changes to "Finish" on last question)
- **Answer Persistence**: User answers are saved when navigating between questions
- **Review Mode**: Previously answered questions show stored answer and feedback

### Question Metadata Display

Each question displays contextual information:
- **Module Name**: The curriculum module (e.g., "Counting in Multiples")
- **Year Group**: Target grade level (e.g., "Year 1")
- **Difficulty Level**: Visual tag showing difficulty (Beginning, Developing, Secure, Mastery)
- **Color-Coded Tags**: Visual distinction for different metadata types

### Results & Scoring

- **Score Calculation**: Percentage and fraction display (e.g., "75%" and "15 / 20")
- **Detailed Breakdown**:
  - Number of correct answers
  - Number of incorrect answers
  - Total answered vs total questions
- **Performance Messages**:
  - Encouraging message for scores ≥70%
  - Motivational message for lower scores
- **Start Over**: Easy restart to try questions again

### User Experience

- **Clean Interface**: Minimal, distraction-free design focused on questions
- **Responsive Design**: Works on tablets and desktops
- **Keyboard Support**: Enter key submits answers for text input questions
- **Submit Protection**: Prevents re-submission of already answered questions
- **Card-Based Layout**: Questions displayed in clean, readable cards
- **Student-Friendly Colors**: Soft, accessible color palette

## Technical Features

### Browser-Based

- **No Installation Required**: Runs entirely in the browser
- **Pure JavaScript**: No frameworks or build dependencies
- **Modern Browser Support**: Chrome 60+, Firefox 60+, Safari 12+, Edge 79+

### Local Server Support

- **Python HTTP Server**: Simple `custom_server.py` for local development
- **CORS Compliant**: Proper server setup prevents cross-origin issues
- **Port 8000 Default**: Configurable port in Python script

### Data Format

Supports JSON exports with the following structure:
- Metadata section (export date, counts, version)
- Questions array with rich properties:
  - Curriculum information (module, strand, year group)
  - Question content and type
  - Correct answer and validation type
  - Multiple choice options (when applicable)
  - Difficulty scoring and levels

## Use Cases

1. **Homework Practice**: Students work through assigned question sets at home
2. **Self-Paced Learning**: Independent practice at student's own pace
3. **Quick Assessment**: Teachers create short quizzes for formative assessment
4. **Review Sessions**: Students review previously exported question sets
5. **Exam Preparation**: Focused practice on specific curriculum modules

## Future Enhancement Opportunities

As noted in the README, potential additions include:
- Fill-in-the-blanks with multiple input fields
- Columnar calculations (vertical arithmetic layout)
- Filtering by module, year group, or difficulty
- Sorting options for question sets
- Detailed results breakdown by difficulty level
- Keyboard shortcuts for power users
- Question review functionality with explanations
- Timed practice mode
- Print-friendly results summary
