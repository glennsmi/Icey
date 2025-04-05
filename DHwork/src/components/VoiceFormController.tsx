import React, { useState, useEffect, useCallback } from 'react';
import { Mic, StopCircle, Sparkles } from 'lucide-react';
import VoiceAgent from './VoiceAgent';

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'select';
  prompt: string;
  options?: { value: string; label: string }[];
  validation?: (value: string) => boolean;
  required?: boolean;
}

interface VoiceFormControllerProps {
  fields: FormField[];
  onFormComplete: (formData: Record<string, string>) => void;
  apiKey: string;
  welcomeMessage?: string;
  agentVoiceId?: string;
}

type FormState = 'welcome' | 'filling' | 'confirming' | 'completed' | 'error';

const VoiceFormController: React.FC<VoiceFormControllerProps> = ({
  fields,
  onFormComplete,
  apiKey,
  welcomeMessage = "Hi there! I'll help you fill out this form using voice. Let's get started.",
  agentVoiceId,
}) => {
  const [formState, setFormState] = useState<FormState>('welcome');
  const [currentFieldIndex, setCurrentFieldIndex] = useState<number>(-1);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isListening, setIsListening] = useState<boolean>(false);
  const [agentMessage, setAgentMessage] = useState<string>(welcomeMessage);
  const [voiceCommands, setVoiceCommands] = useState<any[]>([]);

  // Initialize form data
  useEffect(() => {
    const initialData: Record<string, string> = {};
    fields.forEach(field => {
      initialData[field.id] = '';
    });
    setFormData(initialData);
  }, [fields]);

  // Move to the next field
  const moveToNextField = useCallback(() => {
    if (currentFieldIndex < fields.length - 1) {
      const nextIndex = currentFieldIndex + 1;
      setCurrentFieldIndex(nextIndex);
      const field = fields[nextIndex];
      setAgentMessage(field.prompt);
    } else {
      // All fields filled, move to confirmation
      setFormState('confirming');
      const confirmMessage = "Great! Let's review what you've entered. " + 
        Object.entries(formData).map(([key, value]) => {
          const field = fields.find(f => f.id === key);
          return `${field?.name}: ${value}. `;
        }).join('') +
        "Does that sound correct? Say yes to submit, or no to edit.";
      setAgentMessage(confirmMessage);
    }
  }, [currentFieldIndex, fields, formData]);

  // Move to the previous field
  const moveToPreviousField = useCallback(() => {
    if (currentFieldIndex > 0) {
      const prevIndex = currentFieldIndex - 1;
      setCurrentFieldIndex(prevIndex);
      const field = fields[prevIndex];
      setAgentMessage(`Let's go back to ${field.name}. ${field.prompt}`);
    }
  }, [currentFieldIndex, fields]);

  // Handle field value update
  const updateFieldValue = useCallback((fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  // Process voice input for the current field
  const processFieldInput = useCallback((transcript: string) => {
    if (formState === 'filling' && currentFieldIndex >= 0) {
      const currentField = fields[currentFieldIndex];
      
      // Handle special commands
      if (transcript.toLowerCase().includes('go back')) {
        moveToPreviousField();
        return;
      }
      
      if (transcript.toLowerCase().includes('skip')) {
        if (!currentField.required) {
          moveToNextField();
        } else {
          setAgentMessage(`I'm sorry, ${currentField.name} is required. ${currentField.prompt}`);
        }
        return;
      }
      
      if (transcript.toLowerCase().includes('help')) {
        setAgentMessage(`For ${currentField.name}, ${currentField.prompt}. You can say "go back" to return to the previous question, or "skip" to move to the next question if it's optional.`);
        return;
      }
      
      // Process the input for the current field
      if (currentField.type === 'select' && currentField.options) {
        // Try to match input with one of the options
        const matchedOption = currentField.options.find(
          option => transcript.toLowerCase().includes(option.label.toLowerCase())
        );
        
        if (matchedOption) {
          updateFieldValue(currentField.id, matchedOption.value);
          setAgentMessage(`Got it! ${currentField.name} set to ${matchedOption.label}.`);
          setTimeout(moveToNextField, 2000);
        } else {
          setAgentMessage(`I didn't catch that. Please choose one of the following options: ${currentField.options.map(o => o.label).join(', ')}.`);
        }
      } else {
        // For text inputs, just use the full transcript
        updateFieldValue(currentField.id, transcript);
        setAgentMessage(`Got it! ${currentField.name} set to ${transcript}.`);
        setTimeout(moveToNextField, 2000);
      }
    } else if (formState === 'confirming') {
      // Handle confirmation responses
      if (transcript.toLowerCase().includes('yes') || transcript.toLowerCase().includes('correct')) {
        setFormState('completed');
        setAgentMessage("Wonderful! Your form has been submitted successfully. Thank you for using voice input!");
        onFormComplete(formData);
      } else if (transcript.toLowerCase().includes('no') || transcript.toLowerCase().includes('edit')) {
        // Go back to editing mode
        setFormState('filling');
        setCurrentFieldIndex(0);
        const field = fields[0];
        setAgentMessage(`Let's edit your form. Starting with ${field.name}. ${field.prompt}`);
      }
    }
  }, [formState, currentFieldIndex, fields, moveToNextField, moveToPreviousField, updateFieldValue, formData, onFormComplete]);

  // Set up voice commands
  useEffect(() => {
    const commands = [
      {
        command: 'go back',
        callback: () => moveToPreviousField()
      },
      {
        command: 'skip',
        callback: () => {
          if (currentFieldIndex >= 0 && !fields[currentFieldIndex].required) {
            moveToNextField();
          }
        }
      },
      {
        command: 'help',
        callback: () => {
          if (currentFieldIndex >= 0) {
            const field = fields[currentFieldIndex];
            setAgentMessage(`For ${field.name}, ${field.prompt}. You can say "go back" to return to the previous question, or "skip" to move to the next question if it's optional.`);
          }
        }
      }
    ];
    
    setVoiceCommands(commands);
  }, [moveToPreviousField, moveToNextField, currentFieldIndex, fields]);

  // Start the form process after welcome
  useEffect(() => {
    if (formState === 'welcome') {
      // Wait for welcome message to be spoken, then start the form
      const timer = setTimeout(() => {
        setFormState('filling');
        setCurrentFieldIndex(0);
        if (fields.length > 0) {
          setAgentMessage(fields[0].prompt);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [formState, fields]);

  // Handle transcript changes from the voice agent
  const handleTranscriptChange = (transcript: string) => {
    if (transcript && isListening) {
      processFieldInput(transcript);
    }
  };

  // Render the form visually alongside voice interaction
  return (
    <div className="voice-form-container">
      <div className="voice-form-header">
        <Sparkles className="w-8 h-8 text-indigo-600" />
        <h2 className="text-2xl font-bold">Voice-Guided Form</h2>
      </div>
      
      <div className="voice-agent-container">
        <VoiceAgent
          apiKey={apiKey}
          commands={voiceCommands}
          onTranscriptChange={handleTranscriptChange}
          onStateChange={(state) => setIsListening(state === 'listening')}
          welcomeMessage={welcomeMessage}
          voiceId={agentVoiceId}
        />
      </div>
      
      <div className="voice-form-status">
        <div className="agent-message">
          <p className="text-lg font-medium">{agentMessage}</p>
        </div>
        
        <div className="form-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min(100, (currentFieldIndex / fields.length) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {currentFieldIndex >= 0 ? `Question ${currentFieldIndex + 1} of ${fields.length}` : 'Getting started...'}
          </p>
        </div>
      </div>
      
      <div className="visual-form">
        {fields.map((field, index) => (
          <div 
            key={field.id} 
            className={`form-field ${index === currentFieldIndex ? 'active' : ''} ${formData[field.id] ? 'completed' : ''}`}
          >
            <label>{field.name}</label>
            {field.type === 'select' ? (
              <select
                value={formData[field.id]}
                onChange={(e) => updateFieldValue(field.id, e.target.value)}
                disabled={index !== currentFieldIndex}
              >
                <option value="">Select an option</option>
                {field.options?.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData[field.id]}
                onChange={(e) => updateFieldValue(field.id, e.target.value)}
                placeholder={field.prompt}
                disabled={index !== currentFieldIndex}
              />
            )}
          </div>
        ))}
      </div>
      
      {formState === 'completed' && (
        <div className="completion-message">
          <h3 className="text-xl font-bold text-green-600">Form Submitted!</h3>
          <p>Thank you for using our voice-guided form.</p>
        </div>
      )}
    </div>
  );
};

export default VoiceFormController; 