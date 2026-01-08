
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { AppMode, ResultMode, AspectRatio, StoryboardCut, EditParams, Resolution } from './types';
import { SEQUENCE_TEMPLATES, EXPRESSIONS, LOGO_SVG } from './constants';
import { generateStoryboardLogic, generateImage, generateGridImage, editSingleImage, testConnection } from './services/geminiService';
import ThreeDCube from './components/ThreeDCube';

interface ProcessTile {
  url: string;
  isEnhancing: boolean;
  isEnhanced?: boolean;
  customPrompt?: string;
}

const STORAGE_KEY = 'SCENE_MASTER_BYOK_KEY';

const ICONS = {
  DIRECTING: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v8a2 2 0 002 2z" />
    </svg>
  ),
  CAMERA: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  PROCESS: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  WORKS: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  DOWNLOAD: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
    </svg>
  ),
  CLOSE: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  CONFIRM: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ZIP: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  KEY: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  ENHANCE: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
  )
};

const App: React.FC = () => {
  const [userKey, setUserKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>("");

  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      setUserKey(savedKey);
      setKeyInput(savedKey);
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const handleSaveKey = async () => {
    if (!keyInput.trim()) {
      alert("API 키를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setLoadingStep("API 키 확인 중...");
    const isValid = await testConnection(keyInput);
    setIsLoading(false);
    setLoadingStep("");

    if (isValid) {
      localStorage.setItem(STORAGE_KEY, keyInput);
      setUserKey(keyInput);
      setShowKeyModal(false);
    } else {
      alert("유효하지 않은 API 키입니다. 다시 확인해주세요.");
    }
  };

  const [mode, setMode] = useState<AppMode>(AppMode.CINEMA);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [history, setHistory] = useState<StoryboardCut[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [lightboxPrompt, setLightboxPrompt] = useState("");
  const [lightboxResolution, setLightboxResolution] = useState<Resolution>(Resolution.RES_1K);

  const [selectedTemplate, setSelectedTemplate] = useState(SEQUENCE_TEMPLATES[0].id);
  const [aspectRatio, setAspectRatio] = useState(AspectRatio.LANDSCAPE);
  const [resultMode, setResultMode] = useState<ResultMode>(ResultMode.GRID);
  const [cinemaScenario, setCinemaScenario] = useState("");
  const [selectedResolution, setSelectedResolution] = useState<Resolution>(Resolution.RES_1K);

  const [editParams, setEditParams] = useState<EditParams>({
    rotation: 0,
    tilt: 0,
    zoom: 0,
    denoising: 0.5,
    expression: '기본',
    shotSize: '', // 제거된 필드지만 타입 호환성을 위해 유지
    customPrompt: ''
  });
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [inferredAspectRatio, setInferredAspectRatio] = useState<string>("1:1");

  const [splitCols, setSplitCols] = useState(3);
  const [splitRows, setSplitRows] = useState(3);
  const [splitResults, setSplitResults] = useState<ProcessTile[]>([]);
  const [processAspectRatio, setProcessAspectRatio] = useState<string>('16:9');

  const filteredHistory = history.filter(cut => {
    if (mode === AppMode.GALLERY) return true;
    if (mode === AppMode.CINEMA) return cut.projectId === '그리드 프로젝트' || cut.projectId === '개별 장면' || cut.projectId === '단일 장면';
    if (mode === AppMode.EDIT) return cut.projectId === '카메라모션';
    if (mode === AppMode.PROCESS) return cut.projectId === '이미지분할';
    return true;
  });

  const currentTemplateObj = SEQUENCE_TEMPLATES.find(t => t.id === selectedTemplate);

  const inferRatio = (url: string) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const ratio = img.width / img.height;
      if (ratio > 2) setInferredAspectRatio("21:9");
      else if (ratio > 1.4) setInferredAspectRatio("16:9");
      else if (ratio > 1.1) setInferredAspectRatio("4:3");
      else if (ratio > 0.9) setInferredAspectRatio("1:1");
      else if (ratio > 0.6) setInferredAspectRatio("3:4");
      else setInferredAspectRatio("9:16");
    };
  };

  const handleResolutionError = async (err: any) => {
    if (err.message && (err.message.includes("permission") || err.message.includes("403"))) {
      alert("API 권한이 없거나 설정된 키에 문제가 있습니다. 유료 프로젝트용 키인지 확인해주세요.");
    } else {
      alert(`오류 발생: ${err.message}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultUrl = reader.result as string;
        setBaseImage(resultUrl);
        inferRatio(resultUrl);
        if (mode === AppMode.EDIT) setEditedImage(resultUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setBaseImage(null);
    if (mode === AppMode.EDIT) setEditedImage(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMoveToEdit = (imageUrl: string) => {
    setBaseImage(imageUrl);
    setEditedImage(imageUrl);
    inferRatio(imageUrl);
    setMode(AppMode.EDIT);
    setPreviewImageUrl(null);
  };

  const handleMoveToProcess = (imageUrl: string) => {
    setBaseImage(imageUrl);
    setMode(AppMode.PROCESS);
    setSplitResults([]); 
    setPreviewImageUrl(null); 
  };

  const handleGenerateGrid = async () => {
    if (!userKey) { setShowKeyModal(true); return; }
    setIsLoading(true);
    setLoadingStep("시나리오를 구성하고 있습니다...");
    try {
      if (resultMode === ResultMode.SINGLE) {
        setLoadingStep(`단일 이미지(${selectedResolution}) 생성 중...`);
        const prompt = `Create ONE SINGLE cinematic masterpiece frame. Theme: ${currentTemplateObj?.name || "Original"}. ${cinemaScenario || "Professional quality"}. Fill the frame.`;
        const url = await generateImage(userKey, baseImage, prompt, aspectRatio, selectedResolution);
        
        const newCut: StoryboardCut = {
          id: Date.now().toString(),
          imageUrl: url,
          caption: cinemaScenario || "단일 장면 생성",
          prompt: prompt,
          projectId: '단일 장면'
        };
        setHistory([newCut, ...history]);
      } else {
        const storyboard = await generateStoryboardLogic(
          userKey,
          baseImage, 
          currentTemplateObj?.name || "",
          cinemaScenario
        );

        if (resultMode === ResultMode.GRID) {
          setLoadingStep(`3x3 그리드(${selectedResolution}) 생성 중...`);
          const gridUrl = await generateGridImage(
            userKey,
            baseImage, 
            currentTemplateObj?.name || "",
            cinemaScenario,
            selectedResolution
          );

          const combinedCaption = storyboard.scenes
            .map((s, i) => `[Scene ${i + 1}] ${s.caption}`)
            .join('\n\n');

          const newCut: StoryboardCut = {
            id: Date.now().toString(),
            imageUrl: gridUrl,
            caption: combinedCaption,
            prompt: "그리드 생성",
            projectId: '그리드 프로젝트'
          };
          setHistory([newCut, ...history]);
        } else {
          setLoadingStep(`9개 장면(${selectedResolution}) 개별 생성 중...`);
          const generatedCuts: StoryboardCut[] = [];
          for (let i = 0; i < storyboard.scenes.length; i++) {
            setLoadingStep(`장면 ${i+1}/9 생성 중...`);
            const scene = storyboard.scenes[i];
            const url = await generateImage(userKey, baseImage, scene.prompt, aspectRatio, selectedResolution);
            generatedCuts.push({
              id: `${Date.now()}-${i}`,
              imageUrl: url,
              caption: scene.caption,
              prompt: scene.prompt,
              projectId: '개별 장면'
            });
          }
          setHistory([...generatedCuts, ...history]);
        }
      }
    } catch (error: any) {
      handleResolutionError(error);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleEnhanceHistoryItem = async (id: string, customInstruction?: string, res?: Resolution) => {
    if (!userKey) { setShowKeyModal(true); return; }
    const item = history.find(h => h.id === id);
    if (!item) return;

    const targetRes = res || selectedResolution;
    setIsLoading(true);
    setLoadingStep(`해상도 개선(${targetRes}) 중...`);
    try {
      const prompt = customInstruction || `Mastering: High fidelity cinematic enhancement.`;
      const result = await editSingleImage(userKey, item.imageUrl, prompt, undefined, targetRes);
      setHistory(history.map(h => h.id === id ? { ...h, imageUrl: result, projectId: '이미지분할' } : h));
      if (previewImageUrl === item.imageUrl) setPreviewImageUrl(result);
    } catch (error: any) {
      handleResolutionError(error);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleEditPreview = async () => {
    if (!baseImage) return;
    if (!userKey) { setShowKeyModal(true); return; }
    setIsLoading(true);
    setLoadingStep(`카메라모션 연산(${selectedResolution}) 중...`);
    
    const buildCameraMotionPrompt = (params: EditParams) => {
      let descriptivePrompt = `A professional cinematic shot re-imagined from the source. `;
      
      if (params.rotation > 60) descriptivePrompt += `Camera is at a sharp right profile. `;
      else if (params.rotation > 25) descriptivePrompt += `Camera is at a 3/4 right view. `;
      else if (params.rotation < -60) descriptivePrompt += `Camera is at a sharp left profile. `;
      else if (params.rotation < -25) descriptivePrompt += `Camera is at a 3/4 left view. `;

      if (params.tilt > 50) descriptivePrompt += `Extreme low-angle worm's eye view. `;
      else if (params.tilt > 15) descriptivePrompt += `Low-angle shot. `;
      else if (params.tilt < -60) descriptivePrompt += `Extreme top-down bird's eye view. `;
      else if (params.tilt < -15) descriptivePrompt += `High-angle shot. `;

      // Zoom Slider mapping to Shot Sizes
      if (params.zoom > 70) descriptivePrompt += `Extreme close-up shot focusing on fine details. `;
      else if (params.zoom > 25) descriptivePrompt += `Cinematic close-up shot. `;
      else if (params.zoom > -25) descriptivePrompt += `Standard medium shot. `;
      else if (params.zoom > -70) descriptivePrompt += `Wide cinematic shot. `;
      else descriptivePrompt += `Extreme wide establishing shot. `;

      if (params.expression !== '기본') descriptivePrompt += `Expression: ${params.expression}. `;
      if (params.customPrompt) descriptivePrompt += `${params.customPrompt}. `;

      descriptivePrompt += `Maintain perfect character consistency and clean full-bleed output.`;
      return descriptivePrompt;
    };

    try {
      const instructions = buildCameraMotionPrompt(editParams);
      const targetRatio = aspectRatio === AspectRatio.ORIGINAL ? inferredAspectRatio : (aspectRatio as string);
      const result = await editSingleImage(userKey, baseImage, instructions, targetRatio, selectedResolution);
      
      setEditedImage(result);
      const newCut: StoryboardCut = {
        id: Date.now().toString(),
        imageUrl: result,
        caption: `카메라모션 (Rot: ${editParams.rotation}, Tilt: ${editParams.tilt}, Zoom: ${editParams.zoom})`,
        prompt: instructions,
        projectId: '카메라모션'
      };
      setHistory([newCut, ...history]);
    } catch (error: any) {
      handleResolutionError(error);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleSplitImage = () => {
    if (!baseImage) return;
    const img = new Image();
    img.src = baseImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const tileWidth = img.width / splitCols;
      const tileHeight = img.height / splitRows;
      const tiles: ProcessTile[] = [];
      for (let y = 0; y < splitRows; y++) {
        for (let x = 0; x < splitCols; x++) {
          canvas.width = tileWidth;
          canvas.height = tileHeight;
          ctx.drawImage(img, x * tileWidth, y * tileHeight, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
          tiles.push({ url: canvas.toDataURL(), isEnhancing: false });
        }
      }
      setSplitResults(tiles);
    };
  };

  const handleEnhanceTile = async (index: number, customInstruction?: string, res?: Resolution) => {
    if (!userKey) { setShowKeyModal(true); return; }
    const tile = splitResults[index];
    const newTiles = [...splitResults];
    newTiles[index].isEnhancing = true;
    setSplitResults(newTiles);

    const targetRes = res || selectedResolution;
    setIsLoading(true);
    setLoadingStep(`이미지 개선(${targetRes}) 중...`);

    try {
      const prompt = `High resolution cinematic enhancement. ${customInstruction || ""}. Full bleed, no artifacts.`;
      const result = await editSingleImage(userKey, tile.url, prompt, processAspectRatio, targetRes);
      
      const finalTiles = [...splitResults];
      finalTiles[index] = { ...finalTiles[index], url: result, isEnhancing: false, isEnhanced: true };
      setSplitResults(finalTiles);
      if (previewImageUrl === tile.url) setPreviewImageUrl(result);
      setHistory([{ id: Date.now().toString(), imageUrl: result, caption: `분할 강화 ${index + 1}`, prompt, projectId: '이미지분할' }, ...history]);
    } catch (error: any) {
      handleResolutionError(error);
      const reset = [...splitResults];
      reset[index].isEnhancing = false;
      setSplitResults(reset);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleLightboxEnhance = (isProcessExclusive: boolean = false) => {
    const activeCutInHandler = history.find(hi => hi.imageUrl === previewImageUrl);
    if (activeCutInHandler) {
      handleEnhanceHistoryItem(activeCutInHandler.id, lightboxPrompt, isProcessExclusive ? lightboxResolution : undefined);
    } else {
      const tileIdx = splitResults.findIndex(t => t.url === previewImageUrl);
      if (tileIdx !== -1) handleEnhanceTile(tileIdx, lightboxPrompt, isProcessExclusive ? lightboxResolution : undefined);
    }
  };

  const handleDownloadHistoryZip = async () => {
    const targets = selectedIds.size > 0 ? history.filter(h => selectedIds.has(h.id)) : history;
    if (targets.length === 0) return;
    setIsLoading(true);
    setLoadingStep("압축 중...");
    try {
      const zip = new JSZip();
      const folder = zip.folder("scene-master-storyboard");
      for (const cut of targets) {
        const res = await fetch(cut.imageUrl);
        folder?.file(`shot_${cut.id}.png`, await res.blob());
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `storyboard_${Date.now()}.zip`;
      link.click();
    } catch (e) {
      alert("압축 실패");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const renderCaption = (caption: string) => {
    if (!caption) return <span className="text-slate-500 italic">지문 정보 없음</span>;
    const parts = caption.split(/(\[Scene \d+\])/g);
    if (parts.length <= 1) return <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 text-sm leading-relaxed text-slate-300">{caption}</div>;
    const sceneBlocks = [];
    for (let i = 1; i < parts.length; i += 2) {
      const sceneTitle = parts[i];
      const sceneText = parts[i + 1] ? parts[i + 1].trim() : "";
      sceneBlocks.push(
        <div key={i} className="mb-6 last:mb-0 group/scene">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{sceneTitle}</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/40 text-[13px] leading-relaxed text-slate-300 transition-all group-hover/scene:bg-slate-800/60 group-hover/scene:border-slate-600/50 shadow-sm">
            {sceneText}
          </div>
        </div>
      );
    }
    return <div className="space-y-2">{sceneBlocks}</div>;
  };

  const activeCut = history.find(h => h.imageUrl === previewImageUrl);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200">
      {isLoading && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
          <p className="text-amber-500 font-black uppercase text-xs tracking-widest">{loadingStep}</p>
        </div>
      )}

      <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">{LOGO_SVG}</div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase">Scene Master</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">by 디스이즈머니</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700">
          {[
            { id: AppMode.CINEMA, label: '디렉팅', icon: ICONS.DIRECTING },
            { id: AppMode.EDIT, label: '카메라모션', icon: ICONS.CAMERA },
            { id: AppMode.PROCESS, label: '이미지분할', icon: ICONS.PROCESS },
            { id: AppMode.GALLERY, label: '작업물', icon: ICONS.WORKS },
          ].map(item => (
            <button key={item.id} onClick={() => setMode(item.id as AppMode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === item.id ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowKeyModal(true)} className={`p-2 rounded-lg border transition-all ${userKey ? 'border-slate-700 text-slate-500 hover:text-amber-500' : 'border-amber-500/50 text-amber-500 animate-pulse'}`}>
            {ICONS.KEY}
          </button>
          <button onClick={handleDownloadHistoryZip} disabled={history.length === 0} className="p-2 rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:text-white disabled:opacity-30">
            {ICONS.ZIP}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[360px] border-r border-slate-800 bg-slate-900/30 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1 h-3 bg-amber-500 rounded-full"></div> 원본 이미지
            </h3>
            <div className={`relative group aspect-video rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${baseImage ? 'border-amber-500/50' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
              {baseImage ? (
                <>
                  <img src={baseImage} className="w-full h-full object-cover" alt="Source" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="cursor-pointer p-3 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-all">
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 9l-4-4m0 0L8 9m4-4v12" strokeWidth={2} /></svg>
                    </label>
                    <button onClick={handleRemoveImage} className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-full border border-red-500/20 text-red-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} /></svg>
                    </button>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center text-center p-8">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2.5} /></svg>
                  </div>
                  <span className="text-xs font-bold text-slate-300">이미지 업로드</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </section>

          {mode === AppMode.CINEMA && (
            <section className="space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><div className="w-1 h-3 bg-amber-500 rounded-full"></div> 서사 템플릿</h3>
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm font-bold text-slate-200 outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer">
                  {SEQUENCE_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">화면 비율</label>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer">
                    {Object.values(AspectRatio).map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">생성 형식</label>
                  <div className="flex p-1 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <button onClick={() => setResultMode(ResultMode.GRID)} className={`flex-1 py-1.5 text-[8px] font-black transition-all ${resultMode === ResultMode.GRID ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>3x3그리드</button>
                    <button onClick={() => setResultMode(ResultMode.INDIVIDUAL)} className={`flex-1 py-1.5 text-[8px] font-black transition-all ${resultMode === ResultMode.INDIVIDUAL ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>9장개별</button>
                    <button onClick={() => setResultMode(ResultMode.SINGLE)} className={`flex-1 py-1.5 text-[8px] font-black transition-all ${resultMode === ResultMode.SINGLE ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>1장</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">출력 해상도</label>
                <select value={selectedResolution} onChange={(e) => setSelectedResolution(e.target.value as Resolution)} className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer transition-all ${selectedResolution !== Resolution.RES_1K ? 'border-amber-500 text-amber-500' : 'border-slate-700 text-slate-200'}`}>
                  {Object.values(Resolution).map(res => <option key={res} value={res}>{res} {res !== Resolution.RES_1K ? '(Pro API)' : ''}</option>)}
                </select>
              </div>
              <textarea value={cinemaScenario} onChange={(e) => setCinemaScenario(e.target.value)} placeholder="시나리오 및 연출 지시..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs h-24 outline-none focus:border-amber-500 transition-all resize-none" />
              <button onClick={handleGenerateGrid} disabled={isLoading} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow-xl transition-all flex items-center justify-center gap-3">
                {isLoading ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div> : <>{ICONS.DIRECTING} <span>디렉팅 시작</span></>}
              </button>
            </section>
          )}

          {mode === AppMode.EDIT && (
            <section className="space-y-6">
              <ThreeDCube rotation={editParams.rotation} tilt={editParams.tilt} zoom={editParams.zoom} previewImage={editedImage || baseImage} />
              <div className="space-y-5">
                {[
                  { label: 'Rotation', key: 'rotation', min: -180, max: 180 },
                  { label: 'Tilt', key: 'tilt', min: -90, max: 90 },
                  { label: 'Zoom', key: 'zoom', min: -100, max: 100 },
                ].map(param => (
                  <div key={param.key}>
                    <div className="flex justify-between mb-2"><label className="text-[10px] font-black text-slate-500 uppercase">{param.label}</label><span className="text-[10px] font-mono text-amber-500">{(editParams as any)[param.key]}</span></div>
                    <input type="range" min={param.min} max={param.max} value={(editParams as any)[param.key]} onChange={(e) => setEditParams({...editParams, [param.key]: parseInt(e.target.value)})} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Expression (표정)</label>
                <select value={editParams.expression} onChange={(e) => setEditParams({...editParams, expression: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-amber-500 transition-all">
                  {EXPRESSIONS.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
              <button onClick={handleEditPreview} disabled={isLoading || !baseImage} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl">
                {isLoading ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div> : <>{ICONS.CAMERA} <span>카메라 렌더링</span></>}
              </button>
            </section>
          )}

          {mode === AppMode.PROCESS && (
            <section className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" min="1" max="5" value={splitCols} onChange={(e) => setSplitCols(parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
                <input type="number" min="1" max="5" value={splitRows} onChange={(e) => setSplitRows(parseInt(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>
              <button onClick={handleSplitImage} disabled={!baseImage} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl transition-all">이미지분할 시작</button>
            </section>
          )}
        </aside>

        <section className="flex-1 bg-[#0f172a] overflow-y-auto p-10 no-scrollbar relative">
          {mode === AppMode.PROCESS && splitResults.length > 0 ? (
            <div className="grid gap-0 mx-auto max-w-[1200px]" style={{ gridTemplateColumns: `repeat(${splitCols}, minmax(0, 1fr))` }}>
              {splitResults.map((tile, idx) => (
                <div key={idx} className="group relative aspect-video bg-slate-800 overflow-hidden shadow-xl border border-slate-700/30">
                  <img src={tile.url} className="w-full h-full object-cover cursor-zoom-in transition-opacity group-hover:opacity-90" alt={`Tile ${idx}`} onClick={() => setPreviewImageUrl(tile.url)} />
                  {tile.isEnhancing && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                  {tile.isEnhanced && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-indigo-500 text-[8px] font-black text-white rounded shadow-lg uppercase tracking-widest">Enhanced</div>
                  )}
                </div>
              ))}
            </div>
          ) : filteredHistory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1400px] mx-auto">
              {filteredHistory.map((cut) => (
                <article key={cut.id} className={`group relative flex flex-col bg-slate-800/50 rounded-2xl border-2 transition-all overflow-hidden cursor-zoom-in ${selectedIds.has(cut.id) ? 'border-amber-500' : 'border-slate-800'}`} onClick={() => setPreviewImageUrl(cut.imageUrl)}>
                  <div className="relative aspect-video overflow-hidden">
                    <img src={cut.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Cut" />
                    <div className="absolute top-4 left-4 z-10" onClick={(e) => { e.stopPropagation(); toggleSelect(cut.id); }}>
                       <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(cut.id) ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-lg' : 'bg-black/20 border-white/40 opacity-0 group-hover:opacity-100'}`}>
                        {ICONS.CONFIRM}
                      </div>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="px-2 py-0.5 bg-slate-700 text-[9px] font-black text-slate-300 rounded uppercase tracking-widest w-fit mb-3">{cut.projectId}</span>
                    <p className="text-sm font-medium text-slate-300 leading-relaxed line-clamp-3 italic">"{cut.caption.split('\n\n')[0].replace(/\[Scene \d+\] /, '')}"</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">준비 완료</h2>
            </div>
          )}
        </section>
      </main>

      {showKeyModal && (
        <div className="fixed inset-0 z-[500] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Gemini API 키 설정</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">서비스 이용을 위해 본인의 API 키를 입력해주세요.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">API KEY</label>
                <input 
                  type="password" 
                  value={keyInput} 
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AI Studio에서 발급받은 키를 입력하세요" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm font-mono text-amber-500 outline-none focus:border-amber-500 transition-all shadow-inner"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleSaveKey} className="w-full py-4 bg-amber-500 text-slate-900 font-black rounded-xl text-xs uppercase shadow-xl hover:bg-amber-400 transition-all">저장 및 시작</button>
                <button onClick={() => setShowKeyModal(false)} className="w-full py-4 bg-slate-800 text-slate-400 font-black rounded-xl text-xs uppercase hover:bg-slate-700 transition-all">닫기</button>
              </div>
            </div>
            <p className="text-[9px] text-slate-600 text-center leading-relaxed">
              입력하신 키는 서버로 전송되지 않으며 오직 귀하의 브라우저 로컬 저장소에만 보관됩니다.<br/>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-amber-500/50 underline">키 발급받으러 가기</a>
            </p>
          </div>
        </div>
      )}

      {previewImageUrl && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8" onClick={() => setPreviewImageUrl(null)}>
          <button 
            onClick={() => setPreviewImageUrl(null)} 
            className="absolute top-6 right-6 z-[110] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 active:scale-95"
          >
            {ICONS.CLOSE}
          </button>

          <div className="relative max-w-[1600px] w-full h-full flex flex-col md:flex-row items-center justify-center gap-8" onClick={e => e.stopPropagation()}>
            <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/20">
              <img src={previewImageUrl} className="max-w-full max-h-full object-contain shadow-2xl" alt="Preview" />
            </div>
            <div className="w-full md:w-[480px] h-fit md:h-full flex flex-col bg-slate-900/90 border border-slate-700 rounded-3xl overflow-hidden backdrop-blur-xl">
              <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-8">
                <div><h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">연출 지문</h3><div className="p-1">{renderCaption(activeCut ? activeCut.caption : "")}</div></div>
                
                {mode === AppMode.PROCESS && (
                  <div className="p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-4 shadow-inner">
                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> 이미지분할 전용 기능
                    </h3>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">개선 해상도 선택</label>
                      <select 
                        value={lightboxResolution} 
                        onChange={(e) => setLightboxResolution(e.target.value as Resolution)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {Object.values(Resolution).map(res => (
                          <option key={res} value={res}>{res}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={() => handleLightboxEnhance(true)} 
                      disabled={isLoading}
                      className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs uppercase rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>처리 중...</span>
                        </div>
                      ) : (
                        <>{ICONS.ENHANCE} 테두리제거 및 화질개선</>
                      )}
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">스마트 리마스터링</h3>
                  <textarea value={lightboxPrompt} onChange={(e) => setLightboxPrompt(e.target.value)} placeholder="디테일 수정 또는 추가 연출 지시..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-xs outline-none h-24 focus:border-amber-500 transition-all" />
                  <button onClick={() => handleLightboxEnhance(false)} disabled={isLoading} className="w-full py-4 bg-emerald-500 text-white font-black text-xs uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-70">
                    {isLoading ? "처리 중..." : "강화 적용"}
                  </button>
                </div>
              </div>
              <div className="p-8 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3">
                <button onClick={() => handleMoveToEdit(previewImageUrl)} className="py-4 bg-amber-500 text-slate-900 font-black text-[10px] uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95">{ICONS.CAMERA} 카메라모션</button>
                <button onClick={() => handleMoveToProcess(previewImageUrl)} className="py-4 bg-indigo-500 text-white font-black text-[10px] uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95">{ICONS.PROCESS} 이미지분할</button>
                <button onClick={() => { const a = document.createElement('a'); a.href = previewImageUrl; a.download = "shot.png"; a.click(); }} className="col-span-2 py-4 bg-white text-black font-black text-[10px] uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95">{ICONS.DOWNLOAD} 다운로드</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
