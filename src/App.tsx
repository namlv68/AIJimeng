import React, { useState, useEffect, useCallback } from 'react';
import { 
  Copy, Sparkles, Coffee, Camera, Store, MapPin, User, 
  MessageSquare, Type, GraduationCap, Briefcase, 
  Trees, Palmtree, Landmark, ShoppingBag, Edit3, Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const App = () => {
  const [topic, setTopic] = useState('');
  const [series, setSeries] = useState<any[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [signage, setSignage] = useState('');
  const [costume, setCostume] = useState('Vợ: Váy hoa, Chồng: Áo thun quần đùi');

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Effect to handle initial height and updates for auto-resizing textareas
  useEffect(() => {
    const textareas = document.querySelectorAll('.auto-resize');
    textareas.forEach(textarea => {
      const el = textarea as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    });
  }, [series, currentEpisodeIndex]);

  // Hàm gợi ý cốt truyện 10 tập
  const suggestSeriesWithAI = async () => {
    setIsSuggesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const systemPrompt = `Bạn là một biên kịch phim hài chuyên nghiệp. 
      Nhiệm vụ của bạn là tạo ra một cốt truyện cho series phim hài ngắn (10 tập) về cuộc sống của hai vợ chồng.
      Mỗi tập phim phải có một chủ đề hài hước, đời thường và có tính liên kết nhẹ nhàng.
      
      Yêu cầu: Trả về một JSON object chứa mảng 'episodes' gồm 10 phần tử. 
      Mỗi phần tử có: 'title' (Tiêu đề tập) và 'summary' (Tóm tắt nội dung hài hước khoảng 30-50 từ).`;
      
      const userContent = topic.trim() !== '' 
        ? `Chủ đề chính: ${topic}. Hãy tạo series 10 tập về cuộc sống vợ chồng dựa trên chủ đề này.`
        : `Hãy tạo một series 10 tập hài hước ngẫu nhiên về cuộc sống vợ chồng trẻ.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: userContent }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const content = JSON.parse(response.text || '{}');
      if (content.episodes) {
        setSeries(content.episodes.map((ep: any) => ({ ...ep, prompt: { vi: '', en: '', zh: '' } })));
        setCurrentEpisodeIndex(0);
      }
    } catch (error) {
      console.error("Series suggestion failed:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Hàm tạo Prompt chi tiết cho một tập
  const generateEpisodePrompt = async (index: number, usePreviousContext: boolean = false) => {
    if (!series[index]) return;
    setIsTranslating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const previousContext = usePreviousContext && index > 0 ? series[index-1].prompt?.vi : "";
      
      const systemPrompt = `You are a world-class prompt engineer for Jimeng AI. 
      Create a detailed 12s cinematic video prompt for a comedy series about a husband and wife.
      
      Rules:
      1. Structure (4 stages) - USE LINE BREAKS:
         - 0-3s: Setup (Normal/Warm)
         - 3-6s: Incident (Something happens)
         - 6-9s: Plot Twist (The "Funny" truth)
         - 9-12s: Reaction (Exaggerated facial expressions, funny chase)
      2. Style: Cinematic, 4k, realistic, handheld camera, close-up on faces.
      3. Continuity: If provided, follow the logic of the previous episode's prompt to maintain series flow.
      4. Character: Focus on the funny dynamic between husband and wife.
      
      Return only a JSON object with keys 'vi', 'en', and 'zh'.`;
      
      const userContent = `
        Current Episode Title: ${series[index].title}
        Current Episode Summary: ${series[index].summary}
        Signage: ${signage}
        Costume: ${costume}
        ${previousContext ? `Previous Episode Context: ${previousContext}` : ""}
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: userContent }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const content = JSON.parse(response.text || '{}');
      const updatedSeries = [...series];
      updatedSeries[index].prompt = content;
      setSeries(updatedSeries);
    } catch (error) {
      console.error("Prompt generation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Hàm đồng bộ tiếng Anh và tiếng Trung từ tiếng Việt
  const syncFromVietnamese = useCallback(async (viText: string, index: number) => {
    if (!viText || viText.trim() === '' || !series[index]) return;
    setIsSyncing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const systemPrompt = `You are a world-class prompt engineer. 
      Translate and optimize the following Vietnamese video prompt into English and Chinese for Jimeng AI.
      Maintain the same style, keywords, visual details, and LINE BREAKS between scenes.
      Return only a JSON object with keys 'en' and 'zh'.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: viText }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const content = JSON.parse(response.text || '{}');
      setSeries(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index].prompt = { ...updated[index].prompt, en: content.en, zh: content.zh };
        }
        return updated;
      });
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [series]);

  const lastSyncedVi = React.useRef('');

  // Debounce sync effect
  useEffect(() => {
    const currentVi = series[currentEpisodeIndex]?.prompt?.vi;
    if (!currentVi || isTranslating || currentVi === lastSyncedVi.current) return;

    const timer = setTimeout(() => {
      syncFromVietnamese(currentVi, currentEpisodeIndex);
      lastSyncedVi.current = currentVi;
    }, 1500); // 1.5s debounce for typing
    return () => clearTimeout(timer);
  }, [series, currentEpisodeIndex, isTranslating, syncFromVietnamese]);

  const handleNextEpisode = () => {
    if (currentEpisodeIndex < series.length - 1) {
      const nextIndex = currentEpisodeIndex + 1;
      setCurrentEpisodeIndex(nextIndex);
      // Nếu tập tiếp theo chưa có prompt, tự động gợi ý dựa trên tập trước
      if (!series[nextIndex].prompt?.vi) {
        generateEpisodePrompt(nextIndex, true);
      }
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(id);
      setTimeout(() => setIsCopied(null), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(id);
      setTimeout(() => setIsCopied(null), 2000);
    }
  };

  const currentEpisode = series[currentEpisodeIndex] || null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-red-600 to-red-400 p-3 rounded-2xl shadow-lg ring-4 ring-red-100">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Series AI <span className="text-red-600">Vợ Chồng Hài</span></h1>
              <p className="text-slate-500 text-sm font-medium">Tạo kịch bản seri 10 tập tự động</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support</p>
              <p className="text-sm font-black text-slate-700">0981028794</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <User size={20} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Series Management */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Sparkles size={16} className="text-amber-500" /> Chủ đề Series
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ví dụ: Vợ chồng trẻ ở chung cư..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-all text-sm"
                />
                <button
                  onClick={suggestSeriesWithAI}
                  disabled={isSuggesting}
                  className="px-4 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 text-white rounded-2xl transition-all flex items-center justify-center"
                  title="Gợi ý Series 10 tập"
                >
                  {isSuggesting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
              </div>
            </div>

            {series.length > 0 && (
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Danh sách 10 tập</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {series.map((ep, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentEpisodeIndex(idx)}
                      className={`w-full text-left p-3 rounded-2xl transition-all border ${
                        currentEpisodeIndex === idx 
                          ? 'bg-red-50 border-red-200 ring-1 ring-red-200' 
                          : 'bg-slate-50 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          currentEpisodeIndex === idx ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${currentEpisodeIndex === idx ? 'text-red-700' : 'text-slate-700'}`}>
                            {ep.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{ep.summary}</p>
                        </div>
                        {ep.prompt?.vi && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Prompt Details */}
          <div className="lg:col-span-8 space-y-6">
            {currentEpisode ? (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg text-sm">Tập {currentEpisodeIndex + 1}</span>
                        {currentEpisode.title}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">{currentEpisode.summary}</p>
                    </div>
                    <div className="flex gap-2">
                       <button
                        onClick={() => generateEpisodePrompt(currentEpisodeIndex)}
                        disabled={isTranslating}
                        className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all flex items-center gap-2"
                      >
                        {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        TẠO PROMPT
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Chữ bối cảnh</label>
                      <input 
                        type="text"
                        value={signage}
                        onChange={(e) => setSignage(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                        placeholder="Ví dụ: Vợ là nhất"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Trang phục</label>
                      <input 
                        type="text"
                        value={costume}
                        onChange={(e) => setCostume(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>

                  {currentEpisode.prompt?.vi ? (
                    <div className="bg-slate-900 rounded-[2rem] p-6 space-y-6 border border-slate-800 shadow-xl">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Vietnamese Prompt</span>
                            {isSyncing && <span className="text-[10px] text-amber-500 font-bold animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> ĐANG ĐỒNG BỘ...</span>}
                          </div>
                          <button onClick={() => copyToClipboard(currentEpisode.prompt.vi, 'vi')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
                            {isCopied === 'vi' ? <span className="text-[10px] text-emerald-400 font-bold">COPIED</span> : <Copy size={14} />}
                          </button>
                        </div>
                        <textarea 
                          value={currentEpisode.prompt.vi}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeries(prev => {
                              const updated = [...prev];
                              updated[currentEpisodeIndex].prompt = { ...updated[currentEpisodeIndex].prompt, vi: val };
                              return updated;
                            });
                            autoResize(e);
                          }}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-sm text-slate-300 italic leading-relaxed auto-resize overflow-hidden resize-none focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">English</span>
                            <button onClick={() => copyToClipboard(currentEpisode.prompt.en, 'en')} className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
                              <Copy size={12} />
                            </button>
                          </div>
                          <div className="text-[12px] text-slate-400 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 italic whitespace-pre-wrap leading-relaxed">
                            {currentEpisode.prompt.en}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Chinese</span>
                            <button onClick={() => copyToClipboard(currentEpisode.prompt.zh, 'zh')} className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
                              <Copy size={12} />
                            </button>
                          </div>
                          <div className="text-[12px] text-slate-400 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 italic whitespace-pre-wrap leading-relaxed">
                            {currentEpisode.prompt.zh}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          onClick={handleNextEpisode}
                          disabled={currentEpisodeIndex === series.length - 1 || isTranslating}
                          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all group"
                        >
                          GỢI Ý TẬP TIẾP THEO
                          <Sparkles size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 gap-4">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <Camera size={32} />
                      </div>
                      <p className="text-sm font-medium">Bấm "TẠO PROMPT" để bắt đầu tập này</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                  <Sparkles size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Bắt đầu Series của bạn</h2>
                  <p className="text-slate-500 max-w-md mx-auto mt-2">Nhập chủ đề bên trái và bấm Sparkles để AI gợi ý cốt truyện cho series 10 tập phim hài vợ chồng.</p>
                </div>
                <button 
                  onClick={suggestSeriesWithAI}
                  className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
                >
                  GỢI Ý SERIES NGAY
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}} />
    </div>
  );
};

export default App;
