import imageCompression from 'browser-image-compression'
import { v4 as uuidv4 } from 'uuid'

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY

export async function compressImage(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
    }
    try {
        return await imageCompression(file, options)
    } catch (error) {
        console.error('Error compressing image:', error)
        throw error
    }
}

export async function uploadToImgBB(file: File): Promise<string> {
    const formData = new FormData()
    // Rename file with UUID to avoid duplicates/collisions
    const newFileName = `${uuidv4()}.${file.name.split('.').pop()}`
    const renamedFile = new File([file], newFileName, { type: file.type })

    formData.append('image', renamedFile)
    formData.append('key', IMGBB_API_KEY)

    try {
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        })

        const data = await response.json()

        if (data.success) {
            return data.data.url
        } else {
            throw new Error(data.error?.message || 'Error uploading to ImgBB')
        }
    } catch (error) {
        console.error('Upload Error:', error)
        throw error
    }
}
