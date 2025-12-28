
import React, { useState, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import type { GameState, PlayerAircraft } from '../types';
import { AIRCRAFT_MODELS } from '../constants';
import { Camera, Image as ImageIcon, Loader2, Download, Palette, Sparkles, Key, Settings } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey } from '../utils/apiStorage';

interface PhotoStudioPageProps {
  gameState: GameState;
}

const SCENES = [
  { id: 'cruising', name: '고고도 순항', prompt: 'flying at high altitude with beautiful clouds in the background' },
  { id: 'takeoff', name: '이륙', prompt: 'taking off from a runway with landing gear retracting, nose pitched up' },
  { id: 'landing', name: '착륙', prompt: 'landing on a runway with smoke from tires touching down, flaps fully extended' },
  { id: 'gate', name: '공항 게이트', prompt: 'parked at a modern airport gate with ground service vehicles around, jet bridge connected' },
  { id: 'sunset', name: '석양 비행', prompt: 'flying into a dramatic sunset with golden lighting reflecting on the fuselage' },
];

const FUSELAGE_COLORS = [
  { id: 'White', name: '화이트', hex: '#ffffff', border: 'border-slate-200' },
  { id: 'Silver', name: '실버', hex: '#e5e7eb', border: 'border-slate-300' },
  { id: 'Black', name: '블랙', hex: '#18181b', border: 'border-slate-600' },
  { id: 'Navy', name: '네이비', hex: '#1e3a8a', border: 'border-blue-900' },
  { id: 'Cream', name: '크림', hex: '#fef3c7', border: 'border-amber-100' },
];

const LIVERY_COLORS = [
  { id: 'Blue', name: '블루', hex: '#2563eb' },
  { id: 'Red', name: '레드', hex: '#dc2626' },
  { id: 'Green', name: '그린', hex: '#16a34a' },
  { id: 'Gold', name: '골드', hex: '#ca8a04' },
  { id: 'Orange', name: '오렌지', hex: '#ea580c' },
  { id: 'Purple', name: '퍼플', hex: '#9333ea' },
  { id: 'Teal', name: '청록', hex: '#0d9488' },
  { id: 'Pink', name: '핑크', hex: '#db2777' },
  { id: 'White', name: '화이트', hex: '#ffffff' },
  { id: 'Black', name: '블랙', hex: '#000000' },
];

// Visual traits mapping to distinguish neo/ceo and specific features
const AIRCRAFT_VISUAL_TRAITS: Record<string, string> = {
  'A330neo': 'featuring distinctive curved sharklets at wingtips, large Rolls-Royce Trent 7000 engines, and a prominent black windshield frame',
  'A330-200': 'featuring classic angular canted winglets (bent upwards but straight) and standard size engines',
  'A330-300': 'featuring classic angular canted winglets (bent upwards but straight)',
  'A350': 'featuring futuristic curved wingtips and a sleek nose profile',
  'A350-1000': 'featuring a long fuselage, curved wingtips, and six-wheel main landing gear',
  'A320neo': 'featuring massive high-bypass engines and large curved sharklets at wingtips',
  'A321neo': 'featuring massive high-bypass engines, large curved sharklets at wingtips, and a prominent black windshield frame',
  'A321XLR': 'featuring massive high-bypass engines, large curved sharklets, and a prominent black windshield frame',
  'A320-200': 'featuring classic small triangular wingtip fences and standard engines',
  'B787': 'featuring raked wingtips, chevron serrated engine nacelles (sawtooth pattern on rear of engine), and a sleek nose',
  'B737MAX': 'featuring advanced split scimitar winglets (up and down) and chevron serrated engine nacelles',
  'B737-800': 'featuring standard blended winglets (curved upwards)',
  'B777X': 'featuring folding wingtips and massive GE9X engines',
  'A380': 'featuring a massive double-deck fuselage and four engines',
  'B747-8i': 'featuring a distinctive hump on the upper deck, four large GEnx engines with prominent chevron serrated nacelles (sawtooth pattern on rear exhaust), and a long fuselage',
};

const PhotoStudioPage: React.FC<PhotoStudioPageProps> = ({ gameState }) => {
  const { fleet, airlineProfile } = gameState;
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedSceneId, setSelectedSceneId] = useState<string>(SCENES[0].id);

  // Fuselage State
  const [fuselageFinish, setFuselageFinish] = useState<'paint' | 'metallic'>('paint');
  const [selectedFuselageColorId, setSelectedFuselageColorId] = useState<string>(FUSELAGE_COLORS[0].id);

  const [selectedLiveryColorId, setSelectedLiveryColorId] = useState<string>(LIVERY_COLORS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState<string>(() => {
    return getStoredApiKey() || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [inputKey, setInputKey] = useState('');
  const [showKeySettings, setShowKeySettings] = useState(false);

  const handleSaveKey = () => {
    if (!inputKey.trim()) return;
    setStoredApiKey(inputKey.trim());
    setApiKey(inputKey.trim());
    setInputKey('');
  };

  const handleClearKey = () => {
    clearStoredApiKey();
    setApiKey('');
    setShowKeySettings(false);
  };

  // Get unique aircraft models owned by the player
  const ownedModels = useMemo(() => {
    const modelIds = new Set(fleet.map(ac => ac.modelId));
    return AIRCRAFT_MODELS.filter(m => modelIds.has(m.id));
  }, [fleet]);

  // Set initial model if fleet is not empty
  React.useEffect(() => {
    if (ownedModels.length > 0 && !selectedModelId) {
      setSelectedModelId(ownedModels[0].id);
    }
  }, [ownedModels, selectedModelId]);

  const handleGenerate = async () => {
    if (!selectedModelId || !airlineProfile || !apiKey) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const modelInfo = AIRCRAFT_MODELS.find(m => m.id === selectedModelId);
      const sceneInfo = SCENES.find(s => s.id === selectedSceneId);
      const fuselageInfo = FUSELAGE_COLORS.find(c => c.id === selectedFuselageColorId);
      const liveryInfo = LIVERY_COLORS.find(c => c.id === selectedLiveryColorId);

      if (!modelInfo || !sceneInfo || !fuselageInfo || !liveryInfo) {
        throw new Error("Invalid selection");
      }

      const visualTraits = AIRCRAFT_VISUAL_TRAITS[modelInfo.id] || '';

      // Define fuselage texture/finish based on selection
      const fuselageDesc = fuselageFinish === 'metallic'
        ? 'highly polished bare aluminum fuselage with mirror-like chrome finish, vintage airliner style'
        : `${fuselageInfo.id.toLowerCase()} painted fuselage`;

      const prompt = `A high-quality, photorealistic wide shot of a ${modelInfo.name} passenger aircraft owned by '${airlineProfile.name}'. The aircraft is ${visualTraits}. The text '${airlineProfile.name}' (written in English Romanized letters) is clearly and prominently painted on the side of the ${fuselageDesc}. The aircraft livery features distinct ${liveryInfo.id.toLowerCase()} stripes, tail logo, and accents. The aircraft is ${sceneInfo.prompt}. 8k resolution, highly detailed texture, cinematic lighting, realistic aviation photography.`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      let imageFound = false;
      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64ImageBytes = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            setGeneratedImage(imageUrl);
            imageFound = true;
            break;
          }
        }
      }

      if (!imageFound) {
        throw new Error("No image generated.");
      }

    } catch (err) {
      console.error("Image generation failed:", err);
      setError("비행기 사진을 인화하는 중 문제가 발생했습니다. (API 키를 확인해주거나 잠시 후 다시 시도)");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center h-[60vh] bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 md:p-12 text-center max-w-2xl mx-auto border border-slate-200 dark:border-slate-700">
        <div className="w-20 h-20 bg-brand-blue-100 dark:bg-brand-blue-900/30 rounded-full flex items-center justify-center mb-6">
          <Key className="w-10 h-10 text-brand-blue-600 dark:text-brand-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">API 키 설정이 필요합니다</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
          포토 스튜디오는 <strong>Google Gemini AI</strong>를 사용하여 고품질의 항공기 이미지를 생성합니다.<br />
          이미지 생성을 위해 개인 API 키가 필요합니다.<br />
          <span className="text-sm text-slate-500">(키는 브라우저에만 저장되며 서버로 전송되지 않습니다)</span>
        </p>

        <div className="w-full max-w-md space-y-4">
          <div>
            <label className="block text-left text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Google AI Studio API Key</label>
            <input
              type="password"
              placeholder="YOUR_API_KEY_HERE"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-brand-blue-500 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSaveKey}
            disabled={!inputKey.trim()}
            className="w-full py-3 bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            시작하기
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 w-full">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            API 키가 없으신가요?
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-blue-600 dark:text-brand-blue-400 hover:underline ml-1 font-medium">
              여기서 무료로 발급받으세요
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (ownedModels.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center h-[50vh] bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
        <Camera className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">보유한 항공기가 없습니다.</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">항공기를 구매하거나 리스한 후 포토 스튜디오를 이용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 lg:h-[calc(100vh-140px)] flex flex-col h-auto">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md mr-4">
            <Camera className="w-6 h-6 text-brand-blue-600 dark:text-brand-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">포토 스튜디오</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Nano Banana AI를 사용하여 나만의 항공기 사진을 촬영하세요.</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (window.confirm('API 키를 초기화하시겠습니까? 다시 입력해야 합니다.')) {
              handleClearKey();
            }
          }}
          className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          title="API 키 재설정"
        >
          <Settings className="w-4 h-4 mr-2" />
          API 키 재설정
        </button>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 lg:min-h-0">
        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 flex flex-col lg:overflow-y-auto">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">촬영 설정</h3>

          <div className="space-y-6 flex-grow">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">기종 선택</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-blue-500 focus:border-brand-blue-500"
              >
                {ownedModels.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>

            {/* Scene Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">상황 선택</label>
              <div className="grid grid-cols-1 gap-2">
                {SCENES.map(scene => (
                  <button
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`px-3 py-2 text-sm rounded-md text-left transition-colors ${selectedSceneId === scene.id
                      ? 'bg-brand-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                  >
                    {scene.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuselage Finish & Color */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">동체 마감 (Fuselage)</label>

              {/* Finish Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 mb-3">
                <button
                  onClick={() => setFuselageFinish('paint')}
                  className={`flex-1 flex items-center justify-center py-1.5 text-sm font-medium rounded-md transition-all ${fuselageFinish === 'paint'
                    ? 'bg-white dark:bg-slate-600 text-brand-blue-600 dark:text-brand-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                  <Palette size={14} className="mr-1.5" />
                  일반 도색
                </button>
                <button
                  onClick={() => setFuselageFinish('metallic')}
                  className={`flex-1 flex items-center justify-center py-1.5 text-sm font-medium rounded-md transition-all ${fuselageFinish === 'metallic'
                    ? 'bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                  <Sparkles size={14} className="mr-1.5" />
                  광택 메탈
                </button>
              </div>

              {/* Color Selection (Only for Paint) */}
              {fuselageFinish === 'paint' ? (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  {FUSELAGE_COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedFuselageColorId(color.id)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${selectedFuselageColorId === color.id
                        ? 'ring-2 ring-brand-blue-500 ring-offset-2 dark:ring-offset-slate-800 border-transparent'
                        : color.border
                        }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                      aria-label={color.name}
                    >
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600 text-center animate-fade-in">
                  <div className="w-full h-8 bg-gradient-to-r from-slate-300 via-white to-slate-300 rounded mb-2 opacity-80"></div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">알루미늄 본연의 광택을 살린 클래식한 마감입니다.</p>
                </div>
              )}
            </div>

            {/* Livery Color Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">리버리 포인트 (Livery)</label>
              <div className="flex flex-wrap gap-2">
                {LIVERY_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedLiveryColorId(color.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${selectedLiveryColorId === color.id
                      ? 'ring-2 ring-brand-blue-500 ring-offset-2 dark:ring-offset-slate-800 border-slate-600 dark:border-white'
                      : 'border-transparent'
                      }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                    aria-label={color.name}
                  >
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 px-4 bg-brand-blue-600 hover:bg-brand-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  사진 촬영 (생성)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="lg:col-span-2 bg-black rounded-lg shadow-md relative overflow-hidden flex items-center justify-center min-h-[400px] lg:min-h-full">
          {generatedImage ? (
            <div className="relative w-full h-full flex items-center justify-center group">
              <img src={generatedImage} alt="Generated Aircraft" className="max-w-full max-h-full object-contain" />
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={generatedImage} download={`airline_photo_${Date.now()}.png`} className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors">
                  <Download className="w-4 h-4 mr-2" /> 저장
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              {isGenerating ? (
                <div className="flex flex-col items-center text-slate-400">
                  <div className="w-16 h-16 border-4 border-slate-600 border-t-brand-blue-500 rounded-full animate-spin mb-4"></div>
                  <p>AI가 사진을 현상하고 있습니다...</p>
                  <p className="text-xs text-slate-600 mt-2">잠시만 기다려주세요.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-600">
                  <ImageIcon className="w-20 h-20 mb-4 opacity-50" />
                  <p className="text-lg font-semibold">미리보기</p>
                  <p className="text-sm mt-1">왼쪽 패널에서 설정을 완료하고 촬영 버튼을 눌러주세요.</p>
                  {error && (
                    <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Overlay details */}
          {generatedImage && !isGenerating && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs font-mono">
              {AIRCRAFT_MODELS.find(m => m.id === selectedModelId)?.name} • {SCENES.find(s => s.id === selectedSceneId)?.name}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PhotoStudioPage;
