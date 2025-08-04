import { useState, useRef, useEffect, type FC, type ChangeEvent, type MouseEvent } from 'react';

// --- 아이콘 SVG 컴포넌트 ---
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const AddTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const AddImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;

// --- 타입 정의 ---
interface CanvasSize { width: number; height: number; }
interface BorderOptions { color: string; width: number; enabled: boolean; }
interface DateOptions { enabled: boolean; }
interface BaseLayer { type: 'text' | 'image'; x: number; y: number; }
interface TextLayer extends BaseLayer { type: 'text'; content: string; fontSize: number; fontFamily: string; fontWeight: string; color: string; strokeColor: string; strokeWidth: number; shadowColor: string; shadowBlur: number; shadowOffsetX: number; shadowOffsetY: number; shadowEnabled: boolean; }
interface ImageLayer extends BaseLayer { type: 'image'; src: string; width: number; height: number; }
type Layer = TextLayer | ImageLayer;
interface Template { name: string; layers: Layer[]; canvasSize: CanvasSize; backgroundColor: string; borderOptions: BorderOptions; dateOptions: DateOptions; }
interface DragInfo { isDragging: boolean; targetIndex: number | null; startX: number; startY: number; }

// --- 헬퍼 컴포넌트 (타입 추가) ---
interface ControlWrapperProps { title: string; children: React.ReactNode; }
const ControlWrapper: FC<ControlWrapperProps> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">{title}</h3>
        <div className="space-y-3">{children}</div>
    </div>
);
interface ControlProps { label: string; children: React.ReactNode; }
const Control: FC<ControlProps> = ({ label, children }) => (
    <div>
        <label className="text-sm text-gray-200 mb-1 block">{label}</label>
        {children}
    </div>
);

// --- 메인 앱 컴포넌트 ---
const App: FC = () => {
    // --- 상태 관리 ---
    const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1280, height: 720 });
    const [backgroundColor, setBackgroundColor] = useState<string>('#1a1a1a');
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [borderOptions, setBorderOptions] = useState<BorderOptions>({ color: '#000000', width: 20, enabled: true });
    const [dateOptions, setDateOptions] = useState<DateOptions>({ enabled: true });
    const [layers, setLayers] = useState<Layer[]>([
        {
            type: 'text', content: '문구를 입력하세요', x: 1280 / 2, y: 720 / 2,
            fontSize: 80, fontFamily: 'Gmarket Sans', fontWeight: 'bold',
            color: '#FFFFFF', strokeColor: '#000000', strokeWidth: 6,
            shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 5, shadowEnabled: true
        }
    ]);
    const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(0);
    const [imageObjects, setImageObjects] = useState<Record<string, HTMLImageElement>>({});
    const [templates, setTemplates] = useState<Template[]>([]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const dragInfo = useRef<DragInfo>({ isDragging: false, targetIndex: null, startX: 0, startY: 0 });

    const selectedLayer = selectedLayerIndex !== null ? layers[selectedLayerIndex] : null;
    const fonts = ['Arial', 'Verdana', 'Georgia', 'Impact', 'Courier New', 'Gmarket Sans', 'Noto Sans KR'];

    // --- 템플릿 로딩 ---
    useEffect(() => {
        try {
            const savedTemplates = JSON.parse(localStorage.getItem('thumbnailer_templates') || '[]') as Template[];
            setTemplates(savedTemplates);
        } catch (error) {
            console.error("Failed to parse templates from localStorage", error);
            setTemplates([]);
        }
    }, []);

    // --- 이미지 로딩 ---
    useEffect(() => {
        const imageLayers = layers.filter(l => l.type === 'image') as ImageLayer[];

        imageLayers.forEach(layer => {
            if (layer.src && !imageObjects[layer.src]) {
                const img = new Image();
                img.src = layer.src;
                img.onload = () => {
                    setImageObjects(prev => ({ ...prev, [layer.src]: img }));
                };
            }
        });
        if (backgroundImage && !imageObjects[backgroundImage]) {
            const img = new Image();
            img.src = backgroundImage;
            img.onload = () => {
                setImageObjects(prev => ({ ...prev, [backgroundImage]: img }));
            };
        }

    }, [layers, backgroundImage, imageObjects]);

    // --- 캔버스 렌더링 ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 배경
        if (backgroundImage && imageObjects[backgroundImage]) {
            ctx.drawImage(imageObjects[backgroundImage], 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 테두리
        if (borderOptions.enabled && borderOptions.width > 0) {
            ctx.strokeStyle = borderOptions.color;
            ctx.lineWidth = borderOptions.width;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }

        // 날짜
        if (dateOptions.enabled) {
            const today = new Date();
            const dateString = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 6;
            ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
            ctx.strokeText(dateString, canvas.width - 20, canvas.height - 20);
            ctx.fillText(dateString, canvas.width - 20, canvas.height - 20);
        }

        // 레이어
        layers.forEach((layer) => {
            if (layer.type === 'text') {
                drawText(ctx, layer);
            } else if (layer.type === 'image' && imageObjects[layer.src]) {
                drawImage(ctx, layer, imageObjects[layer.src]);
            }
        });

        // 선택된 레이어 외곽선
        if (selectedLayer) {
            drawSelection(ctx, selectedLayer);
        }

    }, [layers, canvasSize, backgroundColor, backgroundImage, borderOptions, dateOptions, imageObjects, selectedLayer]);

    // --- 그리기 헬퍼 함수 ---
    const drawText = (ctx: CanvasRenderingContext2D, layer: TextLayer) => {
        ctx.save();
        ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        if (layer.shadowEnabled) {
            ctx.shadowColor = layer.shadowColor; ctx.shadowBlur = layer.shadowBlur;
            ctx.shadowOffsetX = layer.shadowOffsetX; ctx.shadowOffsetY = layer.shadowOffsetY;
        }
        if (layer.strokeWidth > 0) {
            ctx.strokeStyle = layer.strokeColor; ctx.lineWidth = layer.strokeWidth;
            ctx.strokeText(layer.content, layer.x, layer.y);
        }
        ctx.fillText(layer.content, layer.x, layer.y);
        ctx.restore();
    };

    const drawImage = (ctx: CanvasRenderingContext2D, layer: ImageLayer, img: HTMLImageElement) => {
        ctx.drawImage(img, layer.x - layer.width / 2, layer.y - layer.height / 2, layer.width, layer.height);
    };

    const drawSelection = (ctx: CanvasRenderingContext2D, layer: Layer) => {
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.9)'; ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        let rect;
        if (layer.type === 'text') {
            ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
            const metrics = ctx.measureText(layer.content);
            rect = { x: layer.x - metrics.width / 2 - 10, y: layer.y - layer.fontSize / 2 - 10, width: metrics.width + 20, height: layer.fontSize + 20, };
        } else {
            rect = { x: layer.x - layer.width / 2 - 5, y: layer.y - layer.height / 2 - 5, width: layer.width + 10, height: layer.height + 10, };
        }
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]);
    };

    // --- 이벤트 핸들러 ---
    const handleLayerPropChange = (prop: keyof TextLayer | keyof ImageLayer, value: any) => {
        if (selectedLayerIndex === null) return;
        setLayers(layers.map((layer, index) =>
            index === selectedLayerIndex ? { ...layer, [prop]: value } : layer
        ));
    };

    const addLayer = (type: 'text' | 'image') => {
        if (type === 'text') {
            const newLayer: TextLayer = {
                type: 'text', content: '새 텍스트', x: canvasSize.width / 2, y: canvasSize.height / 2,
                fontSize: 48, fontFamily: 'Arial', fontWeight: 'bold', color: '#FFFFFF',
                strokeColor: '#000000', strokeWidth: 2,
                shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 5, shadowOffsetX: 2, shadowOffsetY: 2, shadowEnabled: false
            };
            setLayers(prev => {
                const newLayers = [...prev, newLayer];
                setSelectedLayerIndex(newLayers.length - 1);
                return newLayers;
            });
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: Event) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const imgSrc = event.target?.result as string;
                        const img = new Image();
                        img.src = imgSrc;
                        img.onload = () => {
                            const aspectRatio = img.height / img.width;
                            const newWidth = img.width > 300 ? 300 : img.width;
                            const newImageLayer: ImageLayer = {
                                type: 'image', src: imgSrc, x: canvasSize.width / 2, y: canvasSize.height / 2,
                                width: newWidth, height: newWidth * aspectRatio,
                            };
                            setLayers(prev => {
                                const newLayers = [...prev, newImageLayer];
                                setSelectedLayerIndex(newLayers.length - 1);
                                return newLayers;
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        }
    };

    const deleteSelectedLayer = () => {
        if (selectedLayerIndex === null) return;
        setLayers(layers.filter((_, index) => index !== selectedLayerIndex));
        setSelectedLayerIndex(null);
    };

    const handleDownload = () => {
        setSelectedLayerIndex(null);
        setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = 'thumbnail.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }, 100);
    };

    // --- 템플릿 핸들러 ---
    const saveTemplate = () => {
        const name = prompt("템플릿 이름을 입력하세요:", "나만의 템플릿");
        if (!name) return;
        const templateData: Template = { name, layers, canvasSize, backgroundColor, borderOptions, dateOptions };
        const newTemplates = [...templates, templateData];
        setTemplates(newTemplates);
        localStorage.setItem('thumbnailer_templates', JSON.stringify(newTemplates));
        alert('템플릿이 저장되었습니다!');
    };

    const loadTemplate = (template: Template) => {
        setCanvasSize(template.canvasSize);
        setBackgroundColor(template.backgroundColor);
        setBorderOptions(template.borderOptions);
        setDateOptions(template.dateOptions);
        setLayers(template.layers);
        setSelectedLayerIndex(null);
    };

    const deleteTemplate = (name: string) => {
        const newTemplates = templates.filter(t => t.name !== name);
        setTemplates(newTemplates);
        localStorage.setItem('thumbnailer_templates', JSON.stringify(newTemplates));
    };

    // --- 마우스 이벤트 ---
    const getMousePos = (canvas: HTMLCanvasElement, evt: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left) * (canvas.width / rect.width),
            y: (evt.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getMousePos(canvas, e);
        const clickedLayerIndex = [...layers].reverse().findIndex(layer => {
            let rect;
            if (layer.type === 'text') {
                ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
                const metrics = ctx.measureText(layer.content);
                rect = { x: layer.x - metrics.width / 2, y: layer.y - layer.fontSize / 2, width: metrics.width, height: layer.fontSize };
            } else {
                rect = { x: layer.x - layer.width / 2, y: layer.y - layer.height / 2, width: layer.width, height: layer.height };
            }
            return pos.x >= rect.x && pos.x <= rect.x + rect.width && pos.y >= rect.y && pos.y <= rect.y + rect.height;
        });

        if (clickedLayerIndex !== -1) {
            const originalIndex = layers.length - 1 - clickedLayerIndex;
            setSelectedLayerIndex(originalIndex);
            dragInfo.current = { isDragging: true, targetIndex: originalIndex, startX: pos.x - layers[originalIndex].x, startY: pos.y - layers[originalIndex].y };
        } else {
            setSelectedLayerIndex(null);
        }
    };

    const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        if (!dragInfo.current.isDragging || dragInfo.current.targetIndex === null) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const pos = getMousePos(canvas, e);
        handleLayerPropChange('x', pos.x - dragInfo.current.startX);
        handleLayerPropChange('y', pos.y - dragInfo.current.startY);
    };

    const handleMouseUp = () => { dragInfo.current = { isDragging: false, targetIndex: null, startX: 0, startY: 0 }; };

    return (
        <div className="flex flex-col h-screen bg-gray-800 text-white font-sans">
            <header className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-700">
                <h1 className="text-lg font-bold">Thumbnailer</h1>
                <button onClick={handleDownload} className="flex items-center px-4 py-2 text-sm font-semibold bg-blue-600 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors">
                    <DownloadIcon /> <span className="ml-2">저장하기</span>
                </button>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 bg-gray-900 p-5 overflow-y-auto">
                    <div className="flex gap-2 mb-6">
                        <button onClick={() => addLayer('text')} className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"><AddTextIcon /> 텍스트</button>
                        <button onClick={() => addLayer('image')} className="flex-1 flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"><AddImageIcon /> 이미지</button>
                    </div>

                    {selectedLayer ? (
                        <ControlWrapper title="레이어 편집">
                            {/* --- 텍스트 레이어 편집 UI --- */}
                            {selectedLayer.type === 'text' && (
                                <>
                                    <Control label="내용"><textarea value={selectedLayer.content} onChange={(e) => handleLayerPropChange('content', e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></Control>
                                    <Control label="글꼴"><select value={selectedLayer.fontFamily} onChange={(e) => handleLayerPropChange('fontFamily', e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md">{fonts.map(f => <option key={f} value={f}>{f}</option>)}</select></Control>
                                    <Control label={`크기: ${selectedLayer.fontSize}px`}><input type="range" min="10" max="300" value={selectedLayer.fontSize} onChange={(e) => handleLayerPropChange('fontSize', parseInt(e.target.value, 10))} className="w-full"/></Control>
                                    <Control label="색상"><input type="color" value={selectedLayer.color} onChange={(e) => handleLayerPropChange('color', e.target.value)} className="w-full h-9 p-1 bg-gray-800 border border-gray-700 rounded-md"/></Control>
                                    <Control label={`테두리 두께: ${selectedLayer.strokeWidth}px`}><input type="range" min="0" max="20" value={selectedLayer.strokeWidth} onChange={(e) => handleLayerPropChange('strokeWidth', parseInt(e.target.value, 10))} className="w-full"/></Control>
                                    <Control label="테두리 색상"><input type="color" value={selectedLayer.strokeColor} onChange={(e) => handleLayerPropChange('strokeColor', e.target.value)} className="w-full h-9 p-1 bg-gray-800 border border-gray-700 rounded-md"/></Control>
                                    <div className="pt-3 mt-3 border-t border-gray-700">
                                        <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={selectedLayer.shadowEnabled} onChange={(e) => handleLayerPropChange('shadowEnabled', e.target.checked)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"/><span>그림자 효과</span></label>
                                        {selectedLayer.shadowEnabled && <div className="space-y-3 mt-3 pl-2 border-l-2 border-gray-700">
                                            <Control label="그림자 색상"><input type="color" value={selectedLayer.shadowColor} onChange={(e) => handleLayerPropChange('shadowColor', e.target.value)} className="w-full h-9 p-1 bg-gray-800 border border-gray-700 rounded-md"/></Control>
                                            <Control label={`흐림: ${selectedLayer.shadowBlur}px`}><input type="range" min="0" max="50" value={selectedLayer.shadowBlur} onChange={(e) => handleLayerPropChange('shadowBlur', parseInt(e.target.value, 10))} className="w-full"/></Control>
                                            <Control label={`X 오프셋: ${selectedLayer.shadowOffsetX}px`}><input type="range" min="-50" max="50" value={selectedLayer.shadowOffsetX} onChange={(e) => handleLayerPropChange('shadowOffsetX', parseInt(e.target.value, 10))} className="w-full"/></Control>
                                            <Control label={`Y 오프셋: ${selectedLayer.shadowOffsetY}px`}><input type="range" min="-50" max="50" value={selectedLayer.shadowOffsetY} onChange={(e) => handleLayerPropChange('shadowOffsetY', parseInt(e.target.value, 10))} className="w-full"/></Control>
                                        </div>}
                                    </div>
                                </>
                            )}
                            {/* --- 이미지 레이어 편집 UI --- */}
                            {selectedLayer.type === 'image' && (
                                <>
                                    <Control label={`너비: ${Math.round(selectedLayer.width)}px`}><input type="range" min="50" max={canvasSize.width} value={selectedLayer.width} onChange={(e) => handleLayerPropChange('width', parseInt(e.target.value, 10))} className="w-full"/></Control>
                                    <Control label={`높이: ${Math.round(selectedLayer.height)}px`}><input type="range" min="50" max={canvasSize.height} value={selectedLayer.height} onChange={(e) => handleLayerPropChange('height', parseInt(e.target.value, 10))} className="w-full"/></Control>
                                </>
                            )}
                            <button onClick={deleteSelectedLayer} className="w-full flex items-center justify-center gap-2 p-2 mt-4 text-red-400 bg-gray-800 hover:bg-red-900/50 rounded-md transition-colors"><TrashIcon /> 레이어 삭제</button>
                        </ControlWrapper>
                    ) : (
                        /* --- 캔버스 설정 UI (선택된 레이어 없을 때) --- */
                        <ControlWrapper title="캔버스 설정">
                            <Control label="화면 비율">
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setCanvasSize({ width: 1280, height: 720 })} className="p-2 text-sm text-center bg-gray-700 rounded-md hover:bg-gray-600">16:9</button>
                                    <button onClick={() => setCanvasSize({ width: 1080, height: 1920 })} className="p-2 text-sm text-center bg-gray-700 rounded-md hover:bg-gray-600">9:16</button>
                                    <button onClick={() => setCanvasSize({ width: 1080, height: 1080 })} className="p-2 text-sm text-center bg-gray-700 rounded-md hover:bg-gray-600">1:1</button>
                                </div>
                            </Control>
                            <Control label="배경색"><input type="color" value={backgroundColor} onChange={(e) => { setBackgroundColor(e.target.value); setBackgroundImage(null); }} className="w-full h-9 p-1 bg-gray-800 border border-gray-700 rounded-md"/></Control>
                            <Control label="배경 이미지"><input type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if(file) { const reader = new FileReader(); reader.onload = (event) => setBackgroundImage(event.target?.result as string); reader.readAsDataURL(file);}}} className="text-sm text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"/></Control>
                            <div className="pt-3 mt-3 border-t border-gray-700">
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={borderOptions.enabled} onChange={(e) => setBorderOptions(p => ({...p, enabled: e.target.checked}))} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"/><span>전체 테두리</span></label>
                                {borderOptions.enabled && <div className="space-y-3 mt-3 pl-2 border-l-2 border-gray-700">
                                    <Control label={`두께: ${borderOptions.width}px`}><input type="range" min="0" max="50" value={borderOptions.width} onChange={(e) => setBorderOptions(p => ({...p, width: parseInt(e.target.value, 10)}))} className="w-full"/></Control>
                                    <Control label="색상"><input type="color" value={borderOptions.color} onChange={(e) => setBorderOptions(p => ({...p, color: e.target.value}))} className="w-full h-9 p-1 bg-gray-800 border border-gray-700 rounded-md"/></Control>
                                </div>}
                            </div>
                            <div className="pt-3 mt-3 border-t border-gray-700">
                                <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={dateOptions.enabled} onChange={(e) => setDateOptions(p => ({...p, enabled: e.target.checked}))} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"/><span>날짜 표시</span></label>
                            </div>
                        </ControlWrapper>
                    )}

                    <ControlWrapper title="템플릿">
                        <button onClick={saveTemplate} className="w-full p-2 bg-green-600 hover:bg-green-500 rounded-md transition-colors text-sm font-semibold">현재 디자인 템플릿으로 저장</button>
                        <div className="space-y-2 mt-2">
                            {templates.map(template => (
                                <div key={template.name} className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
                                    <span className="text-sm truncate pr-2" title={template.name}>{template.name}</span>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => loadTemplate(template)} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded">적용</button>
                                        <button onClick={() => deleteTemplate(template.name)} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded">삭제</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ControlWrapper>
                </aside>

                <main className="flex-1 flex items-center justify-center p-8 bg-gray-800 overflow-auto">
                    <div className="bg-white shadow-2xl" style={{ boxShadow: '0 0 80px rgba(0,0,0,0.5)' }}>
                        <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height}
                                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                                className="cursor-pointer" style={{ width: '100%', maxWidth: '1280px', height: 'auto' }}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;