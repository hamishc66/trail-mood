
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VibeSelection, VibeOutput } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface HintOutput {
  poetic: string;
  vibeTag: string;
}

export const generateMoodVibe = async (selection: VibeSelection): Promise<VibeOutput> => {
  const ai = getAI();
  const prompt = `Act as an atmospheric trail guide. Generate a vibe-based hiking profile:
  - Time: ${selection.timeOfDay}
  - Energy: ${selection.energyLevel}
  - Weather: ${selection.weatherFeel}
  - Terrain: ${selection.terrain}
  - Sensory Focus: ${selection.sensory}
  - Solitude: ${selection.solitudeLevel}
  - Intent: ${selection.intent} ${selection.customIntent ? `(${selection.customIntent})` : ''}

  Include a "trailTotem": { "name": string, "meaning": string, "icon": "fa-icon-name" }.
  Output MUST be JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedPace: { type: Type.STRING },
          suggestedMindset: { type: Type.STRING },
          musicGenres: { type: Type.ARRAY, items: { type: Type.STRING } },
          reflectiveThought: { type: Type.STRING },
          summary: { type: Type.STRING },
          trailTotem: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              meaning: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["name", "meaning", "icon"]
          }
        },
        required: ["suggestedPace", "suggestedMindset", "musicGenres", "reflectiveThought", "summary", "trailTotem"]
      }
    }
  });

  return JSON.parse(response.text || "{}") as VibeOutput;
};

export const generateTrailVisual = async (vibe: VibeOutput, selection: VibeSelection): Promise<string | null> => {
  const ai = getAI();
  const prompt = `An atmospheric, ultra-high-definition, photographic landscape capturing the "soul" of this trail: 
  ${vibe.summary}. 
  Environment: ${selection.terrain}, ${selection.weatherFeel} weather during ${selection.timeOfDay}. 
  Style: Ethereal, moody, wide-angle nature photography, cinematic lighting, national geographic quality. No people.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Visual generation failed", e);
  }
  return null;
};

export const generateTrailVoice = async (text: string, isAsmr: boolean = false): Promise<Uint8Array | null> => {
  const ai = getAI();
  const systemPrompt = isAsmr 
    ? `Speak this extremely slowly, softly, and with a comforting whisper. Emphasize the airy nature of the words. It should be a true ASMR experience: ${text}`
    : `Speak this in a calm, grounded, nature-guide voice: ${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: systemPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: isAsmr ? 'Puck' : 'Charon' } },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  } catch (e) {
    console.error("TTS failed", e);
  }
  return null;
};

export const askTrailOracle = async (question: string, context: VibeOutput): Promise<string> => {
  const ai = getAI();
  const prompt = `You are the Spirit of the Trail. A hiker asks: "${question}". 
  Their current vibe is "${context.summary}". 
  Answer in 1-2 sentences. Be ancient, cryptic, but comforting. Do not be "cringe" or generic. 
  Speak as if you are the earth, the wind, or the mountain itself.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  return response.text || "";
};

export const getWritingHint = async (text: string, currentIntent: string): Promise<HintOutput | null> => {
  if (!text || text.length < 3) return null;
  const ai = getAI();
  const prompt = `The user is describing a trail intent: "${text}". Poetic version (10 words max) and vibe tag.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            poetic: { type: Type.STRING },
            vibeTag: { type: Type.STRING }
          },
          required: ["poetic", "vibeTag"]
        }
      }
    });
    return JSON.parse(response.text || "{}") as HintOutput;
  } catch (e) { return null; }
};

export const getAtmosphericASMR = async (vibe: VibeOutput): Promise<string> => {
  const ai = getAI();
  const prompt = `Describe the raw, tactile sounds of this environment: "${vibe.summary}". 
  Mention textures like gravel, water, or wind in dry grass. 3 sentences max.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text || "";
};

export const getNearbyVibeSpot = async (selection: VibeSelection, coords?: GeolocationCoordinates): Promise<{ vibe: string; sources: any[] }> => {
  const ai = getAI();
  const prompt = `Atmospheric nature spots near ${coords ? `${coords.latitude}, ${coords.longitude}` : 'Nearby wilderness'} for a ${selection.weatherFeel} ${selection.timeOfDay}.`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: coords ? {
        retrievalConfig: { latLng: { latitude: coords.latitude, longitude: coords.longitude } }
      } : undefined
    },
  });
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.maps)
    .map((chunk: any) => ({ title: chunk.maps.title || "Local Nature Point", uri: chunk.maps.uri || "#" }));
  return { vibe: response.text || "", sources };
};

export const getDeepReflection = async (vibe: VibeOutput): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Expand on this trail thought: "${vibe.reflectiveThought}". Poetic/Philosophical.`,
    config: { thinkingConfig: { thinkingBudget: 32768 } }
  });
  return response.text || "";
};
