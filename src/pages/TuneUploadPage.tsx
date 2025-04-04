import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { storage, db } from '../firebase'
import { analyzeImageWithGemini } from '../utils/geminiAnalysis'

interface TuneUploadPageProps {
  user: User | null;
}

// New interface to include analysis data
interface GeminiAnalysis {
  description: string;
  madLib: {
    sentence: string;
    blank: string;
    original: string;
  };
}

const TuneUploadPage = ({ user }: TuneUploadPageProps) => {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form states
  const [title, setTitle] = useState<string>('')
  const [artist, setArtist] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  
  // Gemini analysis states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null)
  const [madLibAnswer, setMadLibAnswer] = useState<string>('')
  
  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      navigate('/')
    }
  }, [user, navigate])
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setError('')
    setAnalysis(null)
    setMadLibAnswer('')
    
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
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }
    if (!artist.trim()) {
      setError('Please enter an artist name')
      return
    }
    
    setIsUploading(true)
    setError('')
    setSuccess('')
    
    try {
      // Create a reference to the storage location
      const storageRef = ref(storage, `tune_images/${user.uid}/${Date.now()}_${selectedFile.name}`)
      
      // Upload the file
      const uploadTask = uploadBytesResumable(storageRef, selectedFile)
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Track upload progress
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
            
            // Analyze the image with Gemini
            setIsAnalyzing(true)
            let geminiAnalysis = null
            
            try {
              geminiAnalysis = await analyzeImageWithGemini(downloadURL)
              setAnalysis(geminiAnalysis)
            } catch (analysisError) {
              console.error('Image analysis error:', analysisError)
              // Continue even if analysis fails
            }
            
            setIsAnalyzing(false)
            
            // Add the post to Firestore
            await addDoc(collection(db, 'tunes'), {
              userId: user.uid,
              userName: user.displayName || 'Anonymous',
              userPhotoURL: user.photoURL || null,
              title: title.trim(),
              artist: artist.trim(),
              description: description.trim(),
              imageURL: downloadURL,
              timestamp: serverTimestamp(),
              likes: 0,
              analyzed: !!geminiAnalysis,
              analysis: geminiAnalysis || null
            })
            
            setSuccess('Your tune image was uploaded successfully!')
            setIsUploading(false)
            
            // If we have analysis, don't reset form yet to show the mad lib
            if (!geminiAnalysis) {
              resetForm()
              
              // Redirect to dashboard after short delay
              setTimeout(() => {
                navigate('/dashboard')
              }, 2000)
            }
          } catch (error) {
            console.error('Error saving tune data:', error)
            setError('Failed to save tune information. Please try again.')
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

  const resetForm = () => {
    // Reset form
    setTitle('')
    setArtist('')
    setDescription('')
    setSelectedFile(null)
    setPreview('')
    setAnalysis(null)
    setMadLibAnswer('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const handleMadLibSubmit = () => {
    // Store the user's answer somewhere if needed
    resetForm()
    
    // Redirect to dashboard
    navigate('/dashboard')
  }
  
  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1>Share Your Tune</h1>
        <p>Upload an image with your favorite music</p>
        
        {error && <div className="upload-error">{error}</div>}
        {success && <div className="upload-success">{success}</div>}
        
        {analysis ? (
          <div className="gemini-analysis">
            <h2>AI Photo Analysis</h2>
            <p className="analysis-description">{analysis.description}</p>
            
            <div className="madlib-container">
              <h3>Fill in the blank:</h3>
              <p className="madlib-sentence">
                {/* Split the sentence around the blank and insert input */}
                {analysis.madLib.sentence.split('____')[0]}
                <input 
                  type="text" 
                  value={madLibAnswer}
                  onChange={(e) => setMadLibAnswer(e.target.value)}
                  className="madlib-input"
                  placeholder="your answer"
                />
                {analysis.madLib.sentence.split('____')[1] || ''}
              </p>
              <p className="madlib-hint">
                <small>Hint: Original word was "{analysis.madLib.original}"</small>
              </p>
              
              <button 
                onClick={handleMadLibSubmit} 
                className="madlib-submit-button"
                disabled={!madLibAnswer.trim()}
              >
                Submit & Continue
              </button>
            </div>
          </div>
        ) : (
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
            
            <div className="form-group">
              <label htmlFor="tune-title">Song Title*</label>
              <input
                id="tune-title"
                type="text"
                placeholder="Enter the song title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="tune-artist">Song Name*</label>
              <input
                id="tune-artist"
                type="text"
                placeholder="Enter the artist name"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                disabled={isUploading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="tune-description">Description (optional)</label>
              <textarea
                id="tune-description"
                placeholder="Share your thoughts about this tune..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploading}
                rows={3}
              />
            </div>
            
            {isUploading && (
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${uploadProgress}%` }}
                />
                <div className="progress-text">
                  {isAnalyzing ? 'Analyzing image...' : `${Math.round(uploadProgress)}%`}
                </div>
              </div>
            )}
            
            <div className="upload-buttons">
              <button 
                type="submit" 
                className="upload-button"
                disabled={!selectedFile || !title.trim() || !artist.trim() || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Share Tune'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default TuneUploadPage 