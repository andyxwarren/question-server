/**
 * Convert Questions CSV to JSON files per mission
 * 
 * Run with: node convert-questions.js
 */

const fs = require('fs');
const path = require('path');

// Pundex tier mapping (original_pundex 1-4 -> display names)
const pundexMap = {
    1: 'Ignition',
    2: 'Charging',
    3: 'Ready',
    4: 'PowerUp'
};

// Also map to the internal names used by app.js
const pundexInternalMap = {
    1: 'Beginning',
    2: 'Developing',
    3: 'Meeting',
    4: 'Exceeding'
};

// Parse CSV with proper handling of quoted fields
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = parseCSVRow(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = parseCSVRow(lines[i]);
        const row = {};
        headers.forEach((header, idx) => {
            row[header.trim()] = values[idx] ? values[idx].trim() : '';
        });
        rows.push(row);
    }
    return rows;
}

function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Main conversion
async function convert() {
    console.log('Reading CSV files...');
    
    // Read topic_rows
    const topicRowsCSV = fs.readFileSync(
        path.join(__dirname, 'topic_rows Nov25 to map to Andy\'s CDR.csv'),
        'utf-8'
    );
    const topicRows = parseCSV(topicRowsCSV);
    
    // Create topic lookup map
    const topicMap = {};
    topicRows.forEach(row => {
        topicMap[row.topic_id] = {
            world: row.world,
            realm: row.realm,
            mission: row.mission,
            level: parseInt(row.level),
            code: row.code,
            moduleDescription: row.module_description,
            contentDomainRef: row['Content Domain Reference']
        };
    });
    
    console.log(`Loaded ${Object.keys(topicMap).length} topics`);
    
    // Read questions
    const questionsCSV = fs.readFileSync(
        path.join(__dirname, 'Questions', 'Ads Original 26700 Qs.csv'),
        'utf-8'
    );
    const questions = parseCSV(questionsCSV);
    
    console.log(`Loaded ${questions.length} questions`);
    
    // Group questions by mission
    const missionQuestions = {};
    let skipped = 0;
    
    questions.forEach((q, idx) => {
        const topic = topicMap[q.topic_id];
        if (!topic) {
            skipped++;
            return;
        }
        
        const mission = topic.mission;
        if (!missionQuestions[mission]) {
            missionQuestions[mission] = [];
        }
        
        const pundexNum = parseInt(q.original_pundex);
        const pundexDisplay = pundexMap[pundexNum] || 'Ignition';
        const pundexInternal = pundexInternalMap[pundexNum] || 'Beginning';
        
        // Build question object matching existing JSON format
        const questionObj = {
            id: `${topic.code}_Q${q.question_id}`,
            questionNumber: missionQuestions[mission].length + 1,
            moduleId: topic.code,
            moduleName: `${topic.code}: ${topic.mission}`,
            moduleDescription: topic.moduleDescription,
            yearGroup: `Year ${topic.level}`,
            strand: topic.world,
            substrand: topic.realm,
            curriculumRef: topic.contentDomainRef,
            icon: getIcon(topic.world),
            level: topic.level,
            levelName: pundexInternal, // Internal name for app.js filtering
            levelDisplayName: pundexDisplay, // Display name
            difficultyScore: pundexNum * 25,
            questionType: q.answer_type || 'text_input',
            questionText: q.question_text,
            visualType: q.answer_type || 'text_input',
            questionData: {
                type: topic.realm.toLowerCase().replace(/\s+/g, '-'),
                originalText: q.question_text
            },
            correctAnswer: q.correct_answer,
            alternativeAnswers: q.alternative_answer_1 ? [q.alternative_answer_1] : [],
            answerType: 'single',
            multipleChoiceOptions: null,
            hint: `Think about ${topic.mission.toLowerCase()}`,
            multiGapAnswers: null,
            tags: [
                q.answer_type || 'text_input',
                topic.world.toLowerCase().replace(/\s+/g, '-'),
                `year-${topic.level}`,
                topic.mission.toLowerCase().replace(/\s+/g, '-'),
                pundexDisplay.toLowerCase()
            ],
            generatedAt: new Date().toISOString()
        };
        
        missionQuestions[mission].push(questionObj);
    });
    
    console.log(`Skipped ${skipped} questions (no matching topic)`);
    console.log(`Found ${Object.keys(missionQuestions).length} missions`);
    
    // Create output directory
    const outputDir = path.join(__dirname, 'Questions');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write JSON files per mission
    for (const [mission, questions] of Object.entries(missionQuestions)) {
        const filename = mission.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') + '.json';
        const filepath = path.join(outputDir, filename);
        
        const jsonData = {
            metadata: {
                version: '1.0',
                mission: mission,
                questionCount: questions.length,
                source: 'Ads Original 26700 Qs.csv',
                exportDate: new Date().toISOString(),
                generatorVersion: '1.0 (CSV Converter)'
            },
            questions: questions
        };
        
        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2));
        console.log(`Created ${filename} with ${questions.length} questions`);
    }
    
    console.log('\nConversion complete!');
}

function getIcon(world) {
    const icons = {
        'Number': '🔢',
        'Measurement': '📏',
        'Geometry': '📐',
        'Statistics': '📊',
        'Algebra': '🔤',
        'Ratio': '⚖️'
    };
    return icons[world] || '📚';
}

convert().catch(console.error);
