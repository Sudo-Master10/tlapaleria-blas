import React, { useState, useRef } from 'react'
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { compressImage, uploadToImgBB } from '@/lib/imageUtils'
import { Loader2, Upload, Camera, Search, Globe, Scissors } from 'lucide-react'

interface ImageUploaderProps {
    onUpload: (url: string) => void
    currentImage?: string
    productName?: string
}

const SEARCH_WINDOW_NAME = 'PRODUCT_SEARCH_WINDOW';

export default function ImageUploader({ onUpload, currentImage, productName = '' }: ImageUploaderProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const cropperRef = useRef<ReactCropperElement>(null);
    const searchWindowRef = useRef<Window | null>(null);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.addEventListener('load', () => setImageSrc(reader.result as string))
            reader.readAsDataURL(file)
        }
    }

    const openSearch = (type: 'truper' | 'google') => {
        const query = encodeURIComponent(productName);
        let url = '';
        if (type === 'truper') {
            url = `https://www.truper.com/CatVigente/buscador?palabra=${query}`;
        } else {
            url = `https://www.google.com/search?q=${query}&tbm=isch`;
        }

        // Use a unique name AND specific features to force a true window (popup) instead of a tab
        const features = 'width=600,height=500,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes';
        const newWindow = window.open(url, SEARCH_WINDOW_NAME, features);

        if (newWindow) {
            searchWindowRef.current = newWindow;
        }
    }

    const handleCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "never" } as any,
                audio: false
            });

            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();

            // Wait for video to stabilize/render
            await new Promise(resolve => setTimeout(resolve, 800));

            // Draw frame to canvas
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frameData = canvas.toDataURL('image/png');
                setImageSrc(frameData);
            }

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            // Auto-close the search window if it's still open
            if (searchWindowRef.current && !searchWindowRef.current.closed) {
                try {
                    searchWindowRef.current.close();
                    searchWindowRef.current = null;
                } catch (e) {
                    // Silently fail or use a more descriptive error if needed
                }
            }

        } catch (err) {
            console.error("Error capturing screen:", err);
            if ((err as Error).name !== 'NotAllowedError') {
                alert("No se pudo capturar la pantalla.");
            }
        }
    };

    const handleSave = async () => {
        if (typeof cropperRef.current?.cropper === "undefined") {
            console.error("Cropper not initialized");
            alert("Error interno: El editor de imagen no está listo.");
            return;
        }

        try {
            setLoading(true)

            // Get cropped canvas
            const canvas = cropperRef.current?.cropper.getCroppedCanvas({
                width: 800, // Reasonable max width
                height: 800
            });

            if (!canvas) throw new Error("Could not create canvas - Image might be empty or invalid");

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

            if (!blob) throw new Error("Could not create blob from canvas");

            // Convert to File
            const file = new File([blob], "product-image.jpg", { type: "image/jpeg" })

            // Compress
            let compressedFile: File;
            try {
                compressedFile = await compressImage(file)
            } catch (compErr) {
                console.error("Compression failed:", compErr);
                throw new Error("Error al comprimir la imagen. Intenta con otra.");
            }

            // Upload
            let url: string;
            try {
                url = await uploadToImgBB(compressedFile)
            } catch (upErr) {
                console.error("Upload failed:", upErr);
                throw new Error("Error al subir a ImgBB. Verifica tu conexión o la API Key.");
            }

            if (!url) {
                throw new Error("La subida finalizó pero no se recibió URL");
            }

            onUpload(url)
            setImageSrc(null) // Close modal
        } catch (e: any) {
            console.error("Detailed handleSave error:", e)
            alert(`Error al guardar la imagen: ${e.message || e}`);
        } finally {
            setLoading(false)
        }
    }

    if (imageSrc) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
                <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                    <div className="flex-1 bg-gray-900 overflow-hidden relative">
                        <Cropper
                            ref={cropperRef}
                            style={{ height: "100%", width: "100%" }}
                            zoomTo={0.5}
                            initialAspectRatio={1}
                            src={imageSrc}
                            viewMode={1}
                            minCropBoxHeight={10}
                            minCropBoxWidth={10}
                            background={false}
                            responsive={true}
                            autoCropArea={1}
                            checkOrientation={false}
                            guides={true}
                        />
                    </div>

                    <div className="p-4 bg-white border-t flex justify-end gap-2">
                        <button
                            onClick={() => setImageSrc(null)}
                            className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-black text-white rounded-md flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all font-medium"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-4 h-4" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Scissors className="w-4 h-4" />
                                    Recortar y Guardar
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors relative group min-h-[160px]">
                {currentImage ? (
                    <div className="relative w-32 h-32 mb-2 group-hover:opacity-90 transition-opacity">
                        <img
                            src={currentImage}
                            alt="Product"
                            className="w-full h-full object-cover rounded-md shadow-sm"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ) : (
                    <Upload className="w-10 h-10 text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                )}

                <span className="text-sm text-gray-500 font-medium">{currentImage ? 'Cambiar Imagen' : 'Subir Imagen'}</span>

                {/* Traditional File Input */}
                <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Subir desde dispositivo"
                />
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button
                    type="button"
                    onClick={() => openSearch('truper')}
                    disabled={!productName}
                    className="flex flex-col items-center justify-center p-2 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={productName ? "Buscar en Truper" : "Ingresa un nombre primero"}
                >
                    <Search className="w-4 h-4 mb-1" />
                    Buscar Truper
                </button>

                <button
                    type="button"
                    onClick={() => openSearch('google')}
                    disabled={!productName}
                    className="flex flex-col items-center justify-center p-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={productName ? "Buscar en Google" : "Ingresa un nombre primero"}
                >
                    <Globe className="w-4 h-4 mb-1" />
                    Buscar Web
                </button>

                <button
                    type="button"
                    onClick={handleCapture}
                    className="flex flex-col items-center justify-center p-2 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                >
                    <Camera className="w-4 h-4 mb-1" />
                    Capturar
                </button>
            </div>

            {!productName && (
                <p className="text-[10px] text-center text-muted-foreground">
                    Escribe el nombre del producto para habilitar búsqueda.
                </p>
            )}
        </div>
    )
}
