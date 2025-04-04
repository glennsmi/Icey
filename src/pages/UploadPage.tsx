import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, updateProfile } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

interface UploadPageProps {
  user: User | null;
}

const UploadPage = ({ user }: UploadPageProps) => {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      navigate('/')
    }
  }, [user, navigate])
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setError('')
    
    if (!file) {
      setSelectedFile(null)
      setPreview('')
      return
    }
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
      setError('Please select an image file (JPG, PNG, etc.)')
      setSelectedFile(null)
      setPreview('')
      return
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      setSelectedFile(null)
      setPreview('')
      return
    }
    
    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!selectedFile || !user) return
    
    setIsUploading(true)
    setError('')
    setSuccess('')
    
    try {
      // Create a reference to the storage location
      const storageRef = ref(storage, `profile_images/${user.uid}/${Date.now()}_${selectedFile.name}`)
      
      // Upload the file
      const uploadTask = uploadBytesResumable(storageRef, selectedFile)
      
      // Register three observers:
      // 1. 'state_changed' observer, called any time the state changes
      // 2. Error observer, called on failure
      // 3. Completion observer, called on successful completion
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Observe state change events such as progress, pause, and resume
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Upload error:', error)
          setError('Failed to upload image. Please try again.')
          setIsUploading(false)
        },
        async () => {
          // Handle successful uploads on complete
          try {
            // Get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            
            // Update the user's profile with the new image URL
            await updateProfile(user, {
              photoURL: downloadURL
            })
            
            setSuccess('Profile picture updated successfully!')
            setIsUploading(false)
            
            // Clear the file input
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
            
            console.log('Profile updated with new image URL:', downloadURL)
          } catch (error) {
            console.error('Error getting download URL:', error)
            setError('Failed to update profile. Please try again.')
            setIsUploading(false)
          }
        }
      )
    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload image. Please try again.')
      setIsUploading(false)
    }
  }
  
  const handleBack = () => {
    navigate('/dashboard')
  }
  
  return (
    <div className="app-container">
      <div className="upload-card">
        <h1>Upload Profile Picture</h1>
        <p>Select an image to use as your profile picture</p>
        
        {error && <div className="upload-error">{error}</div>}
        {success && <div className="upload-success">{success}</div>}
        
        <form className="upload-form" onSubmit={handleSubmit}>
          {preview && (
            <div className="image-preview-container">
              <img src={preview} alt="Preview" className="image-preview" />
            </div>
          )}
          
          <div className="file-input-container">
            <label htmlFor="file-upload" className="file-input-label">
              {selectedFile ? 'Change Image' : 'Select Image'}
            </label>
            <input 
              id="file-upload"
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
              ref={fileInputRef}
              disabled={isUploading}
            />
          </div>
          
          {isUploading && (
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              />
              <div className="progress-text">{Math.round(uploadProgress)}%</div>
            </div>
          )}
          
          <div className="upload-buttons">
            <button 
              type="button" 
              className="back-button"
              onClick={handleBack}
              disabled={isUploading}
            >
              Back to Dashboard
            </button>
            <button 
              type="submit" 
              className="upload-button"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UploadPage 