/**
 * Regenerate JSON files with correct topic_id to CDR mapping
 * 
 * Run with: node regenerate-json.js
 */

const fs = require('fs');
const path = require('path');

// CDR to Mission name mapping (from Progress Dashboard)
const cdrToMission = {
    // Number & Place Value
    'N1': 'Counting',
    'N2': 'Read, Write, Order & Compare',
    'N3': 'Place Value & Roman Numerals',
    'N4': 'Identify, Represent, Estimate & Round',
    'N5': 'Negative Numbers',
    'N6': 'Number Problems',
    // Calculations
    'C1': 'Add & Subtract Mentally',
    'C2': 'Add & Subtract Written',
    'C3': 'Estimate & Inverse',
    'C4': 'Add & Subtract Problems',
    'C5': 'Properties of Number',
    'C6': 'Mult & Div Mentally',
    'C7': 'Mult & Div Written',
    'C8': 'Solve Problems',
    'C9': 'Order of Operations',
    // Fractions, Decimals & Percentages
    'F1': 'Recognise & Count Fractions',
    'F2': 'Equivalent Fractions',
    'F3': 'Compare & Order',
    'F4': 'Add & Subtract Fractions',
    'F5': 'Multiply & Divide',
    'F6': 'Fractions / Decimals Equiv.',
    'F7': 'Rounding Decimals',
    'F8': 'Compare Decimals',
    'F9': 'Mult & Div Decimals',
    'F10': 'Fraction & Decimal Problems',
    'F11': 'FDP Equivalence',
    'F12': 'Percentage Problems',
    // Ratio & Proportion
    'R1': 'Relative Sizes',
    'R2': 'Percentage Comparison',
    'R3': 'Scale Factors',
    'R4': 'Unequal Sharing',
    // Algebra
    'A1': 'Missing Numbers',
    'A2': 'Formulae',
    'A3': 'Linear Sequences',
    'A4': 'Two Unknowns',
    'A5': 'Combinations of Variables',
    // Measurement
    'M1': 'Compare & Order',
    'M2': 'Estimate & Measure',
    'M3': 'Money',
    'M4': 'Time',
    'M5': 'Metric Conversion',
    'M6': 'Metric / Imperial',
    'M7': 'Perimeter & Area',
    'M8': 'Volume',
    'M9': 'Measurement Problems',
    // Geometry - Shapes
    'G1': '2D Shapes',
    'G2': '3D Shapes',
    'G3': 'Lines & Angles',
    'G4': 'Draw & Construct',
    'G5': 'Circles',
    // Position & Direction
    'P1': 'Pattern & Symmetry',
    'P2': 'Position & Movement',
    'P3': 'Coordinates',
    // Statistics
    'S1': 'Tables & Timetables',
    'S2': 'Charts & Graphs',
    'S3': 'Mean Average'
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

// Extract CDR code from Content Domain Reference (e.g., "1M3" -> "M3", "2M3a" -> "M3")
function extractCDR(contentDomainRef) {
    if (!contentDomainRef) return null;
    // Remove year prefix (1-6) and any suffix letters (a, b, c, d)
    const match = contentDomainRef.match(/^\d([A-Z]\d+)/);
    return match ? match[1] : null;
}

// Main conversion
async function regenerate() {
    console.log('Reading CSV files...');
    
    // Read topic_rows mapping file
    const topicRowsCSV = fs.readFileSync(
        path.join(__dirname, 'topic_rows_NETCM_Nov25 to map to Andy\'s CDR.csv'),
        'utf-8'
    );
    const topicRows = parseCSV(topicRowsCSV);
    
    // Create topic_id to CDR lookup map
    const topicToCDR = {};
    topicRows.forEach(row => {
        const cdr = extractCDR(row['Content Domain Reference']);
        if (cdr) {
            topicToCDR[row.topic_id] = {
                cdr: cdr,
                level: parseInt(row.level) || 1,
                contentDomainRef: row['Content Domain Reference'],
                mission: row.mission,
                world: row.world,
                realm: row.realm
            };
        }
    });
    
    console.log(`Loaded ${Object.keys(topicToCDR).length} topic mappings`);
    
    // Read questions CSV
    const questionsCSV = fs.readFileSync(
        path.join(__dirname, 'Questions', 'Ads Original 26700 Qs.csv'),
        'utf-8'
    );
    const questions = parseCSV(questionsCSV);
    
    console.log(`Loaded ${questions.length} questions`);
    
    // Group questions by CDR code
    const cdrQuestions = {};
    let skipped = 0;
    let mapped = 0;
    
    questions.forEach((q, idx) => {
        const topicInfo = topicToCDR[q.topic_id];
        if (!topicInfo) {
            skipped++;
            return;
        }
        
        const cdr = topicInfo.cdr;
        if (!cdrQuestions[cdr]) {
            cdrQuestions[cdr] = [];
        }
        
        // Build question object
        // original_pundex from CSV is 1-4 (Ignition, Charging, Ready, PowerUp)
        // level from topic mapping is Year 1-6
        const questionObj = {
            question_id: parseInt(q.question_id),
            question_text: q.question_text,
            answer_type: q.answer_type || 'text_input',
            correct_answer: q.correct_answer,
            alternative_answer_1: q.alternative_answer_1 || '',
            original_pundex: parseInt(q.original_pundex) || 1,  // 1-4 pundex tier from CSV
            year_group: parseInt(topicInfo.level) || 1,          // Year 1-6 from topic mapping
            topic_id: parseInt(q.topic_id)
        };
        
        cdrQuestions[cdr].push(questionObj);
        mapped++;
    });
    
    console.log(`Mapped ${mapped} questions, skipped ${skipped}`);
    console.log(`Found ${Object.keys(cdrQuestions).length} CDR codes with questions`);
    
    // Create output directory
    const outputDir = path.join(__dirname, 'Questions');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write JSON files per CDR
    let filesCreated = 0;
    for (const [cdr, missionName] of Object.entries(cdrToMission)) {
        const questions = cdrQuestions[cdr] || [];
        
        // Create filename from CDR and mission name
        const missionFilename = missionName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const filename = `${cdr}_${missionFilename}.json`;
        const filepath = path.join(outputDir, filename);
        
        if (questions.length > 0) {
            fs.writeFileSync(filepath, JSON.stringify(questions, null, 4));
            console.log(`Created ${filename} with ${questions.length} questions`);
            filesCreated++;
        } else {
            console.log(`WARNING: No questions found for ${cdr} (${missionName})`);
        }
    }
    
    console.log(`\nRegeneration complete! Created ${filesCreated} files.`);
    
    // Show CDRs with questions but no mission mapping
    const unmappedCDRs = Object.keys(cdrQuestions).filter(cdr => !cdrToMission[cdr]);
    if (unmappedCDRs.length > 0) {
        console.log('\nUnmapped CDRs with questions:', unmappedCDRs);
    }
}

regenerate().catch(console.error);
