const mysql = require('mysql2/promise');
const db = require('../config/db.js');

const fetchAllFlashCardsAndAnswers = async (setId) => {
    try {
        const query = `
            SELECT *
            FROM flashcards f LEFT JOIN flashcard_answers fa ON f.id = fa.flashcard_id
            WHERE f.set_id = ?
        `;
        const [results] = await db.execute(query, [setId]);
        
        const data = Object.values(results.reduce((acc, { id, question, answer, is_correct }) => {
            if (!acc[id]) {
                acc[id] = { flashcard_id: id, question, correct_answer: 0, answers: [] }
            }
            acc[id].answers.push({ answer, is_correct })
            for (let i = 0; i < acc[id].answers.length; ++i) {
                if (acc[id].answers[i].is_correct) { 
                    acc[id].correct_answer = i; 
                    break; 
                }
            }
            return acc;
        }, {})
        )
        
        return { success: true, data: data };
    } catch (err) {
        console.log('Error: ', err);
        return { success: false, message: err }
    }
}

module.exports = fetchAllFlashCardsAndAnswers;