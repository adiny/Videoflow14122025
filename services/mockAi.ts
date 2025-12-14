import { GoogleGenAI } from "@google/genai";
import { Scene } from '../types';

// Helper to ensure we always get a fresh client with current env key
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Helpers ---

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1) => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true); // File size - 8
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true); // Subchunk2Size

  return new Blob([header, pcmData], { type: 'audio/wav' });
};

const decodeAudioData = async (arrayBuffer: ArrayBuffer, sampleRate: number = 24000): Promise<AudioBuffer> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    return await audioContext.decodeAudioData(arrayBuffer);
};

// --- Mock Assets for Mixing ---

// Simple placeholder sounds (base64 to avoid CORS/Fetch issues in demo)
const MOCK_SFX = {
    whoosh: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=", // Placeholder silent wav
    pop: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
    typing: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
};

// --- Main AI Functions ---

const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const transcribeVideo = async (input: File | string): Promise<string> => {
  const ai = getClient();
  try {
    // Check if input is a YouTube URL string
    if (typeof input === 'string') {
        let videoUrl = input;
        
        // Robust extraction using regex
        const videoId = getYoutubeId(videoUrl);

        // If we found an ID, construct the canonical watch URL required by Gemini
        if (videoId) {
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }

        console.log(`Analyzing YouTube video: ${videoUrl}`);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        fileData: {
                            mimeType: 'video/mp4',
                            fileUri: videoUrl
                        }
                    },
                    {
                        text: `Task: TRANSCRIBE the spoken audio of this video and structure it into a STANDARD SCRIPT for video production.
            
            STRICT RULES:
            1. Break video into numbered scenes.
            2. Each scene MUST be approximately 4, 6, or 8 seconds long.
            3. Use the FORMAT below exactly.
            4. For the 'Visual' field, you MUST use the following photorealistic prompting structure:
               "A photorealistic [shot type] of [subject], [action or expression], set in [environment]. The scene is illuminated by [lighting description], creating a [mood] atmosphere. Captured with a [camera/lens details], emphasizing [key textures and details]."
            
            FORMAT:
            Scene [Number] ([Start:MM:SS]-[End:MM:SS]): [Descriptive Title]
            VO: "[Spoken Text]"
            Visual: [Photorealistic visual description]
            
            Example:
            Scene 1 (00:00-00:04): Introduction
            VO: "Welcome back to the channel."
            Visual: A photorealistic close-up of a confident host smiling, set in a modern studio. The scene is illuminated by soft key lighting, creating a professional atmosphere. Captured with a 85mm lens, emphasizing the eyes.
            
            Scene 2 (00:04-00:10): The Problem
            VO: "Today we are solving a major issue."
            Visual: A photorealistic medium shot of a frustrated office worker staring at a computer screen, set in a busy open-plan office. The scene is illuminated by cool fluorescent overhead light, creating a stressful atmosphere. Captured with a 35mm lens, emphasizing the clutter.
            `
                    }
                ]
            }
        });
        
        return response.text || "Could not generate transcript from YouTube URL.";
    }

    // Handle File Object (Native Upload)
    const base64Data = await fileToBase64(input);
    
    // Using gemini-3-pro-preview for advanced video analysis of uploaded files
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: input.type,
              data: base64Data
            }
          },
          {
            text: `Analyze the video's audio and visual content. Transcribe VERBATIM and structure into a STANDARD SCRIPT.
            
            STRICT RULES:
            1. Break video into numbered scenes (approx 4, 6, or 8 seconds each).
            2. For the 'Visual' field, use this PHOTOREALISTIC PROMPT FORMULA:
               "A photorealistic [shot type] of [subject], [action or expression], set in [environment]. The scene is illuminated by [lighting description], creating a [mood] atmosphere. Captured with a [camera/lens details], emphasizing [key textures and details]."
            
            Format:
            Scene [Number] ([Start:MM:SS]-[End:MM:SS]): [Title]
            VO: "[Spoken Text]"
            Visual: [Photorealistic visual description]`
          }
        ]
      }
    });

    return response.text || "No transcript generated.";
  } catch (error) {
    console.error("AI Transcription failed:", error);
    return "Error: Could not transcribe video. Please ensure the video is public and accessible.";
  }
};

export const rewriteScript = async (text: string, instruction?: string): Promise<string> => {
  const ai = getClient();
  try {
    const customInstruction = instruction 
        ? `User Instruction: ${instruction}` 
        : "Optimize for engagement, clarity, and social media pacing.";

    // Using gemini-3-pro-preview for higher quality creative writing
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Rewrite the following text into a STANDARD SCRIPT format.
      
      ${customInstruction}
      
      STRICT TIMING RULES:
      1. Break into numbered scenes.
      2. Each scene MUST be approximately 4, 6, or 8 seconds long.
      3. For the 'Visual' field, use this PHOTOREALISTIC PROMPT FORMULA:
         "A photorealistic [shot type] of [subject], [action or expression], set in [environment]. The scene is illuminated by [lighting description], creating a [mood] atmosphere. Captured with a [camera/lens details], emphasizing [key textures and details]."
      
      FORMAT:
      Scene [Number] (00:00-00:XX): [Scene Title]
      VO: "[Spoken Text]"
      Visual: [Photorealistic visual description]
      
      Original Text:
      ${text}`
    });
    return response.text || text;
  } catch (error) {
    console.error("AI Rewrite failed:", error);
    return text;
  }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const ai = getClient();
    // Skip translation for English variants if source is assumed English
    if (targetLanguage.toLowerCase().startsWith('english')) return text;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Translate the following text into ${targetLanguage}. Return ONLY the translated text, nothing else.\n\nText: ${text}`
        });
        return response.text || text;
    } catch (error) {
        console.error("Translation failed:", error);
        return text; 
    }
}

// Helper to construct the Gold Standard TTS Prompt
const buildTtsPrompt = (text: string, voiceName: string, visualContext?: string) => {
  const sceneDescription = visualContext && visualContext.length > 5 
      ? visualContext 
      : "A professional recording studio environment.";

  return `
# AUDIO PROFILE: ${voiceName}
## "Professional Video Narrator"

## THE SCENE: Visual Context
${sceneDescription}

### DIRECTOR'S NOTES
Style:
* The "Vocal Smile": Friendly, engaging, and professional.
* Dynamics: Clear projection, good articulation.
* Tone: Optimistic and authoritative.

Pace: Moderate, natural conversational pace.

### SAMPLE CONTEXT
Narrating a video segment.

#### TRANSCRIPT
${text}`;
};

export const generateSpeech = async (text: string, voiceName: string, visualContext?: string): Promise<string> => {
  const ai = getClient();
  try {
    // Wrap the text in the prompt structure for better expressiveness
    const richPrompt = buildTtsPrompt(text, voiceName, visualContext);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: richPrompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from Gemini API");

    const pcmData = base64ToUint8Array(base64Audio);
    // 24000Hz is the default for gemini-2.5-flash-preview-tts
    const wavBlob = addWavHeader(pcmData, 24000, 1);
    
    // Return Data URL for persistence
    return await blobToDataUrl(wavBlob);
  } catch (error) {
    console.error("TTS Generation failed:", error);
    throw error;
  }
};

// --- MIXER ENGINE (Web Audio API) ---

export const generateMixedSceneAudio = async (
    text: string, 
    visualPrompt: string, 
    voiceName: string = "Aoede"
): Promise<string> => {
    const ai = getClient();
    try {
        // 1. Analyze Visual for SFX Keyword using Gemini
        const sfxAnalysis = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this visual description: "${visualPrompt}". 
            Suggest ONE single sound effect keyword from this list: [whoosh, pop, typing, nature, city, office, silence].
            Return ONLY the keyword.`
        });
        const sfxKeyword = (sfxAnalysis.text?.trim().toLowerCase() || 'silence').replace(/[^a-z]/g, '');
        
        console.log(`Audio Mixer: Selected SFX '${sfxKeyword}' for prompt '${visualPrompt}'`);

        // 2. Generate Voiceover (TTS)
        // Pass visualPrompt to generateSpeech to use as context
        const ttsUrl = await generateSpeech(text, voiceName, visualPrompt);
        const ttsResponse = await fetch(ttsUrl);
        const ttsArrayBuffer = await ttsResponse.arrayBuffer();

        // 3. Initialize OfflineAudioContext for Mixing
        // We need to decode first to know the duration
        const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const ttsBuffer = await tempContext.decodeAudioData(ttsArrayBuffer);
        
        // Total duration = TTS duration + 1s tail
        const totalDuration = ttsBuffer.duration + 1.0;
        const sampleRate = 44100;
        const offlineCtx = new OfflineAudioContext(2, sampleRate * totalDuration, sampleRate);

        // 4. Create Sources & Gain Nodes
        
        // --- Layer 1: Voiceover ---
        const voiceSource = offlineCtx.createBufferSource();
        voiceSource.buffer = ttsBuffer;
        voiceSource.connect(offlineCtx.destination);
        voiceSource.start(0);

        // --- Layer 2: Background Music (BGM) ---
        // Mock BGM - In real app, fetch from URL
        // Using a synthesized simple tone for demo purposes to avoid external URL deps
        const bgmOsc = offlineCtx.createOscillator();
        bgmOsc.type = 'sine';
        bgmOsc.frequency.setValueAtTime(110, 0); // Low drone (A2)
        const bgmGain = offlineCtx.createGain();
        
        // Auto-Ducking Logic:
        // Volume starts at 0.1 (background)
        // When speech is active (0 to ttsBuffer.duration), volume stays low
        // We can slightly raise it at the end
        bgmGain.gain.setValueAtTime(0.05, 0); 
        bgmGain.gain.linearRampToValueAtTime(0.05, ttsBuffer.duration); 
        bgmGain.gain.linearRampToValueAtTime(0.0, totalDuration); // Fade out

        bgmOsc.connect(bgmGain);
        bgmGain.connect(offlineCtx.destination);
        bgmOsc.start(0);
        bgmOsc.stop(totalDuration);

        // --- Layer 3: SFX ---
        // If keyword isn't silence, we would play an SFX
        if (sfxKeyword !== 'silence') {
            // For this demo, we use a simple oscillator chirp to represent SFX
            // In a real app, you'd fetch(MOCK_SFX[sfxKeyword]) and decode
            const sfxOsc = offlineCtx.createOscillator();
            sfxOsc.frequency.setValueAtTime(800, 0.5); // Start at 0.5s
            sfxOsc.frequency.exponentialRampToValueAtTime(1200, 0.7);
            const sfxGain = offlineCtx.createGain();
            sfxGain.gain.setValueAtTime(0.1, 0.5);
            sfxGain.gain.exponentialRampToValueAtTime(0.01, 0.9);
            
            sfxOsc.connect(sfxGain);
            sfxGain.connect(offlineCtx.destination);
            sfxOsc.start(0.5);
            sfxOsc.stop(0.9);
        }

        // 5. Render
        const renderedBuffer = await offlineCtx.startRendering();

        // 6. Encode to WAV
        // We need to interleave channels if stereo, or just take ch0 for mono
        const mixedPcm = renderedBuffer.getChannelData(0); // Taking Left channel for simplicity in this helper
        // Convert Float32 to Int16 for our addWavHeader helper (which expects 16-bit PCM roughly)
        // Actually addWavHeader helper expects Uint8Array of bytes.
        // Let's create a robust converter:
        const int16Array = new Int16Array(mixedPcm.length);
        for (let i = 0; i < mixedPcm.length; i++) {
            const s = Math.max(-1, Math.min(1, mixedPcm[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const wavBytes = new Uint8Array(int16Array.buffer);
        const wavBlob = addWavHeader(wavBytes, sampleRate, 1); // 1 Channel
        
        return await blobToDataUrl(wavBlob);

    } catch (error) {
        console.error("Mixer Engine Failed:", error);
        // Fallback to simple TTS if mixing fails
        return await generateSpeech(text, voiceName);
    }
}

export const generateImage = async (
    prompt: string, 
    options: { 
        model?: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
        aspectRatio?: string; 
        imageSize?: string; 
        useGrounding?: boolean 
    } = {}
): Promise<string> => {
  try {
    const { 
        model = 'gemini-3-pro-image-preview', 
        aspectRatio = '16:9', 
        imageSize = '1K', 
        useGrounding = false 
    } = options;

    const win = window as any;
    
    // Helper to make the API call with the fresh key
    const makeCall = async () => {
        const imageAi = getClient();
        
        // Config construction
        const config: any = {
            imageConfig: {
                aspectRatio: aspectRatio,
            }
        };

        // Pro-specific configs (Grounding and Image Size are only supported in Pro)
        const tools: any[] = [];
        if (model === 'gemini-3-pro-image-preview') {
            config.imageConfig.imageSize = imageSize;
            if (useGrounding) {
                tools.push({ googleSearch: {} });
            }
        }
        
        if (tools.length > 0) {
            config.tools = tools;
        }

        const response = await imageAi.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: prompt }]
            },
            config: config
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part && part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No image data found in response");
    };

    try {
        return await makeCall();
    } catch (error: any) {
        // Handle 403 Permission Denied or 404 Not Found (often means billing not enabled for project)
        if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('404')) {
            console.warn("Permission denied, prompting for key selection...");
            if (typeof window !== 'undefined' && win.aistudio) {
                await win.aistudio.openSelectKey();
                // Retry once
                return await makeCall();
            }
        }
        throw error;
    }

  } catch (error) {
    console.error("Image generation failed:", error);
    // Fallback to placeholder to not break the UI flow completely if errors persist
    const hash = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `https://picsum.photos/seed/${hash}/800/600`;
  }
};

export const editImage = async (currentImageUrl: string, editInstruction: string, elementImageFiles: File[] = []): Promise<string> => {
  const win = window as any;
  
  const makeCall = async () => {
      const ai = getClient();
      let mimeType = 'image/jpeg';
      let data = '';

      if (currentImageUrl.startsWith('data:')) {
          const matches = currentImageUrl.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
              mimeType = matches[1];
              data = matches[2];
          }
      } else {
          const response = await fetch(currentImageUrl);
          const blob = await response.blob();
          mimeType = blob.type;
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
          }
          data = btoa(binary);
      }

      const parts: any[] = [
          {
              inlineData: {
                  mimeType: mimeType,
                  data: data
              }
          },
          {
              text: editInstruction
          }
      ];

      if (elementImageFiles && elementImageFiles.length > 0) {
          for (const file of elementImageFiles) {
             const elementBase64 = await fileToBase64(file);
             parts.push({
                  inlineData: {
                      mimeType: file.type,
                      data: elementBase64
                  }
             });
          }
      }

      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts },
          config: {
              imageConfig: {
                  aspectRatio: "16:9",
                  imageSize: "1K"
              }
          }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part && part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      throw new Error("No edited image returned");
  };

  try {
      return await makeCall();
  } catch (error: any) {
      if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('404')) {
          if (typeof window !== 'undefined' && win.aistudio) {
                await win.aistudio.openSelectKey();
                return await makeCall();
          }
      }
      console.error("Edit failed", error);
      throw error;
  }
}

// --- Veo 3.1 Video Generation Logic ---

const VEO_PROMPT_INSTRUCTION = `You are an expert prompt engineer for Google's Veo 3.1, an advanced AI video generation model.
Your task is to take a standard video script segment and convert it into a highly detailed, production-ready Veo 3.1 prompt.

GUIDELINES:
1. **Subject**: Identify the core object, person, or scenery (e.g., "A futuristic cityscape", "A woman in a red coat").
2. **Action**: Describe the movement (e.g., "walking confidently", "looking at the horizon").
3. **Style**: Specify creative direction (e.g., "Cinematic", "Film noir", "3D Animation", "Photorealistic").
4. **Camera**: Control location/movement (e.g., "Aerial view", "Dolly shot", "Eye-level", "Close-up").
5. **Composition**: Frame the shot (e.g., "Wide shot", "Two-shot", "Single-shot").
6. **Focus/Lens**: (Optional) E.g., "Shallow focus", "Macro lens", "Wide-angle lens".
7. **Ambiance**: Describe lighting/color (e.g., "Warm golden hour", "Cool blue tones", "Cinematic lighting").
8. **Audio** (CRITICAL):
    *   **Dialogue**: Use quotes. (Example: The man says, "This is the key.")
    *   **Sound Effects (SFX)**: Explicitly describe sounds. (Example: SFX: tires screeching.)
    *   **Ambient Noise**: Describe background soundscape. (Example: Ambient noise: wind howling.)

INPUT:
*   Spoken Text (VO)
*   Visual Description

OUTPUT:
A SINGLE integrated prompt paragraph.

Example Output:
"A cinematic close-up of a young woman smiling in a sunlit park (Subject/Context). She laughs and turns towards the camera (Action). Soft focus background with warm lighting (Style/Ambiance). Ambient noise: Birds chirping and children playing in the distance. She says cheerfully, 'It's a beautiful day!' SFX: A bicycle bell rings nearby."
`;

const transformScriptToVeoPrompt = async (script: string, visualDescription: string, duration: number): Promise<string> => {
    const ai = getClient();
    try {
        const formattedInput = `
Script VO: "${script}"
Visual Concept: "${visualDescription}"
Duration: ${duration} seconds
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `System Instruction: ${VEO_PROMPT_INSTRUCTION}
            
            ${formattedInput}`
        });
        return response.text || "";
    } catch (e) {
        console.error("Failed to transform prompt", e);
        return `${visualDescription}. Audio: ${script} (Duration: ${duration}s)`;
    }
}

export const generateVeoVideo = async (sceneScript: string, sceneVisual: string, imageBase64: string, duration: number = 6): Promise<string> => {
    const win = window as any;
    const makeCall = async () => {
        const veoAi = getClient();
        const veoPrompt = await transformScriptToVeoPrompt(sceneScript, sceneVisual, duration);
        console.log("Generated Veo Prompt:", veoPrompt);

        let operation = await veoAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: veoPrompt,
            image: {
                imageBytes: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await veoAi.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            throw new Error(`Veo Generation Error: ${operation.error.message || JSON.stringify(operation.error)}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("No video URI returned from Veo");

        const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await videoRes.blob();
        
        return await blobToDataUrl(videoBlob);
    };
    
    try {
        return await makeCall();
    } catch (error: any) {
        if (error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('404')) {
            console.warn("Permission denied for Veo, prompting for key selection...");
            if (typeof window !== 'undefined' && win.aistudio) {
                await win.aistudio.openSelectKey();
                return await makeCall();
            }
        }
        console.error("Veo Generation Failed", error);
        throw error;
    }
};

export const parseScriptToScenes = (script: string): Scene[] => {
  const scenes: Scene[] = [];
  // Split script by "Scene [Number]" pattern to handle multi-line blocks
  const blocks = script.split(/Scene\s+\d+/i).slice(1); // Skip empty first element
  
  const DEFAULT_VISUAL = "A photorealistic wide shot of the subject, set in a professional environment. The scene is illuminated by cinematic lighting, creating a polished atmosphere. Captured with a high-resolution camera.";

  blocks.forEach((block, index) => {
    // 1. Extract Duration from Timestamps (e.g., (00:00-00:04))
    let duration = 6;
    const timeMatch = block.match(/\(\d+:?(\d*)-(\d+:?(\d*))\)/);
    if (timeMatch) {
       // Parse start and end seconds approximately
       // This is a naive parse assuming minutes:seconds or just seconds
       // Example: 00:00-00:04
       const endPart = timeMatch[2]; // 00:04
       const endSeconds = parseInt(endPart.split(':').pop() || '6', 10);
       
       const startPart = block.match(/\((\d+:?(\d*))-/) ? block.match(/\((\d+:?(\d*))-/)?.[1] : '0';
       const startSeconds = parseInt(startPart?.split(':').pop() || '0', 10);
       
       if (!isNaN(endSeconds) && !isNaN(startSeconds)) {
           duration = endSeconds - startSeconds;
           if (duration <= 0) duration = 6;
       }
    }

    // 2. Extract VO
    const voMatch = block.match(/VO:\s*"?([^"\n]+)"?/);
    const text = voMatch ? voMatch[1].trim() : "";

    // 3. Extract Visual
    const visualMatch = block.match(/Visual:\s*([^\n]+)/); // Capture single line visual for now, or use /Visual:\s*([\s\S]*?)(?=Scene|$)/ for multiline
    // Given the prompt asks for "Visual: ...", let's assume it's one line or the rest of the block
    let visual = "";
    if (visualMatch) {
        visual = visualMatch[1].trim();
    } else {
        // Fallback: Check if there is a 'Visual:' tag and take everything after it
        const splitVisual = block.split('Visual:');
        if (splitVisual.length > 1) {
            visual = splitVisual[1].trim();
        }
    }

    if (text || visual) {
        scenes.push({
            id: `scene-${Date.now()}-${index}`,
            project_id: '',
            order_index: index,
            text_segment: text || " ",
            visual_prompt: visual || DEFAULT_VISUAL,
            duration: duration
        });
    }
  });
  
  return scenes;
};