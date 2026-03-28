import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey });
};

export interface UserProfile {
  name: string;
  gender: string;
  age: string;
  country: string;
  state: string;
  weight: string;
  height: string;
  width: string;
  language: "English" | "Hindi" | "English Version";
  planType: "Daily" | "Weekly" | "Monthly" | "Morning" | "Evening" | "Night";
  illnesses: string[];
  month: string;
}

export interface DietPlanResponse {
  planMarkdown: string;
  recommendedFoods: { name: string; imageKeyword: string }[];
}

export async function generateDietPlan(profile: UserProfile, bmi: number, bodyFat: number): Promise<DietPlanResponse> {
  const prompt = `Generate a highly personalized diet plan based on the following specific profile:
    - Name: ${profile.name}
    - Gender: ${profile.gender}
    - Age: ${profile.age} years old
    - Location: ${profile.state}, ${profile.country}
    - Current Month: ${profile.month}
    - Body Metrics: Weight ${profile.weight}, Height ${profile.height}, Width ${profile.width}
    - Calculated BMI: ${bmi.toFixed(1)}
    - Estimated Body Fat Percentage: ${bodyFat.toFixed(1)}%
    - Plan Type/Time: ${profile.planType} (This is the specific scope of the plan)
    - Health Conditions/Illnesses: ${(profile.illnesses || []).length > 0 ? profile.illnesses.join(", ") : "None"}
    
    CRITICAL: The diet plan MUST be strictly tailored to the specific food availability, cultural dietary habits, and local "zones" of ${profile.state}, ${profile.country} during the month of ${profile.month}.
    
    IMPORTANT: The plan must strictly account for the selected health conditions (${(profile.illnesses || []).join(", ")}). Provide specific dietary restrictions and recommendations for these conditions.
    
    SEASONAL REQUIREMENT: You MUST prioritize seasonal fruits, vegetables, and grains that are naturally available in ${profile.state} during ${profile.month}.
    
    SCOPE: The plan should focus on the selected time/type: ${profile.planType}. 
    - If "Daily" is selected, provide a full day plan with exactly these four courses:
      1. Morning Breakfast
      2. Lunch
      3. Evening Snack
      4. Night Dinner
    - If "Morning", "Evening", or "Night" is selected, provide a detailed meal plan for that specific time.
    - If "Weekly" or "Monthly" is selected, provide a comprehensive plan for that duration.
    
    LANGUAGE REQUIREMENT: Please provide the entire response in ${profile.language}. 
    - If "Hindi" is selected, use clear Hindi script.
    - If "English Version" is selected, provide a simplified, direct version of English.
    - If "English" is selected, provide a standard detailed English response.
    
    Provide a detailed guide including:
    1. Recommended local foods for early morning/start of the day available in ${profile.state}.
    2. Nutritional breakdown tailored to their body metrics and calculated BMI/Body Fat.
    3. Why these specific regional foods are suitable for this profile.
    4. Tips for sourcing these ingredients locally in ${profile.country}.
    5. A detailed recipe for one of the recommended foods including ingredients, instructions, and cooking time.
    
    ALSO, provide a list of EXACTLY 40 diverse local food items recommended for this profile. For each item, provide a short, descriptive English keyword that can be used to fetch a relevant food image from a stock photo service (e.g., "ripe mango", "steamed idli", "whole wheat paratha").
    
    Return the response ONLY as a JSON object with the following structure:
    {
      "planMarkdown": "The full detailed markdown diet plan here...",
      "recommendedFoods": [
        { "name": "Food Name in ${profile.language}", "imageKeyword": "English keyword for image" },
        ... (exactly 40 items)
      ]
    }`;

  const response: GenerateContentResponse = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error parsing diet plan JSON:", error);
    return {
      planMarkdown: response.text || "Failed to generate diet plan.",
      recommendedFoods: []
    };
  }
}

export async function generateRecipe(profile: UserProfile): Promise<any> {
  const prompt = `Generate a single detailed recipe suitable for:
    - Name: ${profile.name}
    - Gender: ${profile.gender}
    - Age: ${profile.age}
    - Location: ${profile.state}, ${profile.country}
    - Month: ${profile.month}
    - Health Conditions: ${(profile.illnesses || []).join(", ")}
    - Meal Time/Type: ${profile.planType}
    
    SEASONAL REQUIREMENT: Use ingredients that are seasonally available in ${profile.state} during ${profile.month}.
    
    LANGUAGE REQUIREMENT: Please provide the entire response in ${profile.language}. 
    - If "Hindi" is selected, use clear Hindi script.
    - If "English Version" is selected, provide a simplified, direct version of English.
    - If "English" is selected, provide a standard detailed English response.
    
    Return the response ONLY as a JSON object with the following structure:
    {
      "title": "Recipe Name",
      "ingredients": ["ing 1", "ing 2"],
      "instructions": ["step 1", "step 2"],
      "cookingTime": "e.g. 15 mins",
      "category": "e.g. Breakfast"
    }`;

  const response: GenerateContentResponse = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function analyzeFoodImage(base64Image: string): Promise<string> {
  const prompt = `Analyze this food image and provide a detailed report:
    1. **Identification**: Identify the food items present in the image.
    2. **Nutritional Breakdown**: Provide estimated values for:
       - Calories (kcal)
       - Protein (g)
       - Carbohydrates (g)
       - Fats (g)
    3. **Estimation Logic**: If precise identification is difficult, provide common estimations based on visual cues (portion size, ingredients).
    4. **Health Insights**: Brief benefits or concerns.
    
    Format the response clearly in Markdown with bold headers.`;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image.split(",")[1] || base64Image,
    },
  };

  const response: GenerateContentResponse = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [imagePart, { text: prompt }] },
  });

  return response.text || "Failed to analyze image.";
}

export async function generateFoodImage(foodName: string): Promise<string> {
  const prompt = `A high-quality, professional food photography shot of ${foodName}. 
    The lighting should be natural and appetizing. 
    The background should be clean and minimalist, suitable for a health and diet application. 
    Focus on the textures and colors of the food.`;

  const response: GenerateContentResponse = await getAI().models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
}
