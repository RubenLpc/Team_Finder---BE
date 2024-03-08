const OpenAI = require("openai");
const{API_KEY} = require('../constants/index')
const openai = new OpenAI({
  apiKey: API_KEY,
});
const db = require("../db");

const getUsersWithSkills = async () => {

  const usersQuery = "SELECT user_id, username, email, password FROM users;";
  const usersResult = await db.query(usersQuery);
  const users = usersResult.rows;


  const usersWithSkills = [];
  for (const user of users) {
    const skillsQuery = `
        SELECT skill_id, level, experience
        FROM UserSkills
        WHERE user_id = $1;
      `;
    const skillsResult = await db.query(skillsQuery, [user.user_id]);
    const skills = skillsResult.rows;

    usersWithSkills.push({
      ...user,
      skills,
    });
  }

  return usersWithSkills;
};



exports.findExperts = async (req, res) => {
    try {
      console.log("Request Body:", req.body);
  

      if (!req.body || !req.body.additionalContext) {
        return res.status(400).json({ error: "Invalid request body" });
      }
  

      const usersWithSkills = await getUsersWithSkills();
  

      if (usersWithSkills.length === 0) {
        return res.status(404).json({ error: "Nu s-au găsit utilizatori cu abilitățile specificate." });
      }
  
      
      const gptResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: req.body.additionalContext }, 
          { role: "user", content: JSON.stringify(usersWithSkills) }, 
          { role: "user", content: "Aș vrea ca răspunsul tău sa fie bazat pe skill-uri si pe experienta si level(level 5 fiind cel mai ridicat), sa mi-i returnezi in ordine fara texte suplimentare, primul sa fie cel mai pregatit, cei care nu au skill-rui sau nu au skill-uri in domeniul precizat, sa nu ii recomanzi" },
          { role: "user", content: "Aș vrea ca răspunsul tău să fie fara niciun text suplimentar si sa fie organizat astfel încât să-l pot converti în JSON" },

        ],
        format: "json",
      });
  
      console.log("Chat-GPT Response:", gptResponse.choices[0].message.content);

      const chatGptResponse = gptResponse.choices[0].message.content;

      const expertsArray = JSON.parse(chatGptResponse);

      res.json(expertsArray);
    } catch (error) {
      console.error("Error processing Chat-GPT response:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
