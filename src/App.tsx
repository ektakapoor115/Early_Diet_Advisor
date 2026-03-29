import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  User, 
  MapPin, 
  Activity, 
  Camera, 
  ChevronRight, 
  Loader2, 
  Utensils, 
  Info,
  ArrowLeft,
  Upload,
  Sparkles,
  Heart,
  Globe,
  Download,
  Share2,
  MessageCircle,
  Clock,
  Check,
  Trash2,
  Key,
  Droplets,
  Plus,
  Minus,
  Candy,
  Flame,
  Waves,
  Layers,
  ChevronDown,
  Save,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  Scale,
  Ruler,
  History
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { generateDietPlan, analyzeFoodImage, generateRecipe, UserProfile, DietPlanResponse, generateFoodImage } from "./services/gemini";
import { RecipeCard, Recipe } from "./components/RecipeCard";

const COUNTRIES_STATES: Record<string, string[]> = {
// ... existing countries ...
  "India": [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ],
  "USA": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", 
    "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", 
    "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", 
    "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", 
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", 
    "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ],
  "UK": ["England", "Scotland", "Wales", "Northern Ireland"],
  "Canada": ["Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick", "Newfoundland and Labrador", "Prince Edward Island"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"],
};

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    gender: "female",
    age: "24",
    country: "India",
    state: "Jharkhand",
    weight: "45",
    height: "155",
    width: "28",
    language: "Hindi",
    planDuration: "Daily",
    mealScope: "All Meals",
    illnesses: [],
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date()),
    dietaryPreference: "Non-Vegan",
    activityLevel: "Sedentary",
    allergy: [],
    goal: "Weight Loss",
    tastePreference: "Combo",
    maritalStatus: "Single",
    derivativePreference: "Standard",
    energyAddon: "None",
  });
  const [savedProfiles, setSavedProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("diet_advisor_profiles");
    return saved ? JSON.parse(saved) : [];
  });
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [dietPlan, setDietPlan] = useState<DietPlanResponse | null>(null);
  const [nutritionInfo, setNutritionInfo] = useState<string | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem("diet_advisor_favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const [favoritePlans, setFavoritePlans] = useState<{ id: string; plan: DietPlanResponse; profile: UserProfile; date: string }[]>(() => {
    const saved = localStorage.getItem("diet_advisor_favorite_plans");
    return saved ? JSON.parse(saved) : [];
  });
  const [planHistory, setPlanHistory] = useState<{ id: string; plan: DietPlanResponse; profile: UserProfile; date: string }[]>(() => {
    const saved = localStorage.getItem("diet_advisor_plan_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "plan" | "analyze" | "favorites" | "tracker" | "history">("home");
  const [isTasteDropdownOpen, setIsTasteDropdownOpen] = useState(false);
  const [aiImages, setAiImages] = useState<Record<string, string>>({});
  const [waterIntake, setWaterIntake] = useState<number>(() => {
    const saved = localStorage.getItem("diet_advisor_water_intake");
    return saved ? parseInt(saved) : 0;
  });
  const [waterGoal, setWaterGoal] = useState<number>(() => {
    const saved = localStorage.getItem("diet_advisor_water_goal");
    return saved ? parseInt(saved) : 8;
  });
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState<Record<string, boolean>>({});
  const [isAnalyzingNutrition, setIsAnalyzingNutrition] = useState<Record<string, boolean>>({});
  const [hasApiKey, setHasApiKey] = useState(false);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const lastQuotaErrorTime = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem("diet_advisor_water_intake", waterIntake.toString());
  }, [waterIntake]);

  useEffect(() => {
    localStorage.setItem("diet_advisor_water_goal", waterGoal.toString());
  }, [waterGoal]);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const calculateMetrics = () => {
// ... existing metrics ...
    // Parse weight and height (assuming kg and cm)
    const w = parseFloat(profile.weight);
    const h = parseFloat(profile.height) / 100; // to meters
    const age = parseInt(profile.age);
    
    if (isNaN(w) || isNaN(h) || isNaN(age) || h === 0) return { bmi: 0, bodyFat: 0 };
    
    const bmi = w / (h * h);
    const genderFactor = profile.gender === "male" ? 1 : 0;
    
    // Deurenberg formula for body fat estimation
    const bodyFat = (1.20 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4;
    
    return { bmi, bodyFat };
  };

  const { bmi, bodyFat } = calculateMetrics();

  // Re-generate plan if language changes and a plan exists
  useEffect(() => {
    if (dietPlan && !isGeneratingPlan) {
      handleGeneratePlan();
    }
  }, [profile.language]);

  const generateDietPDFBlob = async (): Promise<File | null> => {
    const element = document.getElementById('diet-report');
    if (!element) return null;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            :root {
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;
              --color-emerald-200: #a7f3d0 !important;
              --color-emerald-500: #10b981 !important;
              --color-emerald-600: #059669 !important;
              --color-emerald-700: #047857 !important;
              --color-red-50: #fef2f2 !important;
              --color-red-100: #fee2e2 !important;
              --color-red-500: #ef4444 !important;
              --color-red-600: #dc2626 !important;
              --color-red-800: #991b1b !important;
              --color-orange-500: #f97316 !important;
              --color-green-50: #f0fdf4 !important;
              --color-green-400: #4ade80 !important;
              --color-green-500: #22c55e !important;
              --color-green-600: #16a34a !important;
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;
              --color-emerald-200: #a7f3d0 !important;
              --color-emerald-500: #10b981 !important;
              --color-emerald-600: #059669 !important;
              --color-emerald-700: #047857 !important;
              --color-blue-400: #60a5fa !important;
              --color-purple-400: #c084fc !important;
              --color-pink-400: #f472b6 !important;
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-600: #4b5563 !important;
              --color-black: #000000 !important;
              --color-white: #ffffff !important;
              --color-transparent: transparent !important;
            }
            .bg-red-50\/30 { background-color: rgba(254, 242, 242, 0.3) !important; }
            .bg-red-50\/50 { background-color: rgba(254, 242, 242, 0.5) !important; }
            .text-red-800\/70 { color: rgba(153, 27, 27, 0.7) !important; }
            .text-slate-900\/40 { color: rgba(15, 23, 42, 0.4) !important; }
            .text-white\/60 { color: rgba(255, 255, 255, 0.6) !important; }
            .bg-black\/20 { background-color: rgba(0, 0, 0, 0.2) !important; }
            .bg-black\/40 { background-color: rgba(0, 0, 0, 0.4) !important; }
            .bg-white\/80 { background-color: rgba(255, 255, 255, 0.8) !important; }
            .border-green-500\/30 { border-color: rgba(34, 197, 94, 0.3) !important; }
            .border-red-500\/30 { border-color: rgba(239, 68, 68, 0.3) !important; }
            .bg-gradient-to-t { --tw-gradient-position: to top !important; }
            .focus\:ring-emerald-500\/20:focus { --tw-ring-color: rgba(16, 185, 129, 0.2) !important; }
            .from-black\/80 { --tw-gradient-from: rgba(0, 0, 0, 0.8) !important; }
            .via-black\/20 { --tw-gradient-via: rgba(0, 0, 0, 0.2) !important; }
            
            #diet-report, [id^="recipe-"] {
              background-color: #ffffff !important;
              color: #0f172a !important;
            }
            #diet-report *, [id^="recipe-"] * {
              box-shadow: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      const pdfBlob = pdf.output('blob');
      return new File([pdfBlob], `Diet_Report_${profile.state}_${profile.country}.pdf`, { type: 'application/pdf' });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    const file = await generateDietPDFBlob();
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Fallback
      const element = document.getElementById('diet-report');
      if (element) {
        const html2pdfFunc = (html2pdf as any).default || html2pdf;
        html2pdfFunc().from(element).save(`Diet_Report_${profile.state}_${profile.country}.pdf`);
      }
    }
  };

  const handleDownloadRecipePDF = async (recipe: Recipe) => {
    const element = document.getElementById(`recipe-${recipe.id}`);
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            :root {
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;
              --color-emerald-200: #a7f3d0 !important;
              --color-emerald-500: #10b981 !important;
              --color-emerald-600: #059669 !important;
              --color-emerald-700: #047857 !important;
              --color-red-50: #fef2f2 !important;
              --color-red-100: #fee2e2 !important;
              --color-red-500: #ef4444 !important;
              --color-red-600: #dc2626 !important;
              --color-red-800: #991b1b !important;
              --color-orange-500: #f97316 !important;
              --color-green-50: #f0fdf4 !important;
              --color-green-400: #4ade80 !important;
              --color-green-500: #22c55e !important;
              --color-green-600: #16a34a !important;
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;
              --color-emerald-200: #a7f3d0 !important;
              --color-emerald-500: #10b981 !important;
              --color-emerald-600: #059669 !important;
              --color-emerald-700: #047857 !important;
              --color-blue-400: #60a5fa !important;
              --color-purple-400: #c084fc !important;
              --color-pink-400: #f472b6 !important;
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-600: #4b5563 !important;
              --color-black: #000000 !important;
              --color-white: #ffffff !important;
              --color-transparent: transparent !important;
            }
            .bg-red-50\/30 { background-color: rgba(254, 242, 242, 0.3) !important; }
            .bg-red-50\/50 { background-color: rgba(254, 242, 242, 0.5) !important; }
            .text-red-800\/70 { color: rgba(153, 27, 27, 0.7) !important; }
            .text-slate-900\/40 { color: rgba(15, 23, 42, 0.4) !important; }
            .text-white\/60 { color: rgba(255, 255, 255, 0.6) !important; }
            .bg-black\/20 { background-color: rgba(0, 0, 0, 0.2) !important; }
            .bg-black\/40 { background-color: rgba(0, 0, 0, 0.4) !important; }
            .bg-white\/80 { background-color: rgba(255, 255, 255, 0.8) !important; }
            .border-green-500\/30 { border-color: rgba(34, 197, 94, 0.3) !important; }
            .border-red-500\/30 { border-color: rgba(239, 68, 68, 0.3) !important; }
            .bg-gradient-to-t { --tw-gradient-position: to top !important; }
            .focus\:ring-emerald-500\/20:focus { --tw-ring-color: rgba(16, 185, 129, 0.2) !important; }
            .from-black\/80 { --tw-gradient-from: rgba(0, 0, 0, 0.8) !important; }
            .via-black\/20 { --tw-gradient-via: rgba(0, 0, 0, 0.2) !important; }
            
            #diet-report, [id^="recipe-"] {
              background-color: #ffffff !important;
              color: #0f172a !important;
            }
            #diet-report *, [id^="recipe-"] * {
              box-shadow: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Recipe_${recipe.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Recipe PDF Error:", error);
    }
  };

  // Expose to window for RecipeCard to call
  useEffect(() => {
    (window as any).downloadRecipePDF = handleDownloadRecipePDF;
    return () => { delete (window as any).downloadRecipePDF; };
  }, [dietPlan, favorites]);

  const handleShareToWhatsAppWeb = async () => {
    if (!dietPlan) return;
    
    const file = await generateDietPDFBlob();
    const text = `Check out my personalized diet plan from Diet Advisor! Please see the attached file and the location.\n\nLocation: ${profile.state}, ${profile.country}`;

    // On mobile, navigator.share is much better as it actually attaches the file
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My Personalized Diet Plan',
          text: text
        });
        return;
      } catch (error) {
        console.error("Share Error:", error);
      }
    }

    // Fallback for desktop or when navigator.share fails
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSharePDF = async () => {
    if (!dietPlan) return;
    
    const file = await generateDietPDFBlob();
    if (!file) return;

    const text = `Check out my personalized diet plan from Diet Advisor! Please see the attached file and the location.\n\nLocation: ${profile.state}, ${profile.country}`;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My Personalized Diet Plan',
          text: text
        });
      } catch (error) {
        console.error("Share Error:", error);
      }
    } else {
      // Fallback: Just download the PDF and alert
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      alert("Your device doesn't support direct file sharing. The PDF has been downloaded so you can share it manually.");
    }
  };

  const handleGenerateAiFoodImage = async (foodName: string) => {
    if (aiImages[foodName] || isGeneratingAiImage[foodName]) return;
    
    setIsGeneratingAiImage(prev => ({ ...prev, [foodName]: true }));
    try {
      const imageUrl = await generateFoodImage(foodName);
      setAiImages(prev => ({ ...prev, [foodName]: imageUrl }));
    } catch (error) {
      console.error("Error generating AI image:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        const now = Date.now();
        if (now - lastQuotaErrorTime.current > 10000) { // Throttle alerts to once every 10 seconds
          lastQuotaErrorTime.current = now;
          setQuotaModalOpen(true);
        }
      }
    } finally {
      setIsGeneratingAiImage(prev => ({ ...prev, [foodName]: false }));
    }
  };

  const handleAnalyzeNutrition = async (recipe: Recipe, imageUrl: string) => {
    if (isAnalyzingNutrition[recipe.id]) return;
    
    setIsAnalyzingNutrition(prev => ({ ...prev, [recipe.id]: true }));
    try {
      const nutritionMarkdown = await analyzeFoodImage(imageUrl);
      
      // Flexible regex to extract values from markdown
      const caloriesMatch = nutritionMarkdown.match(/Calories.*?(\d+)/i);
      const proteinMatch = nutritionMarkdown.match(/Protein.*?(\d+(?:\.\d+)?\s*g)/i);
      const carbsMatch = nutritionMarkdown.match(/Carbohydrates.*?(\d+(?:\.\d+)?\s*g)/i);
      const fatsMatch = nutritionMarkdown.match(/Fats.*?(\d+(?:\.\d+)?\s*g)/i);
      
      const nutrition = {
        calories: caloriesMatch ? `${caloriesMatch[1]} kcal` : "N/A",
        protein: proteinMatch ? proteinMatch[1] : "N/A",
        carbs: carbsMatch ? carbsMatch[1] : "N/A",
        fats: fatsMatch ? fatsMatch[1] : "N/A"
      };
      
      const updatedRecipe = { ...recipe, nutrition };
      
      if (currentRecipe?.id === recipe.id) {
        setCurrentRecipe(updatedRecipe);
      }
      
      setFavorites(prev => {
        const newFavs = prev.map(r => r.id === recipe.id ? updatedRecipe : r);
        localStorage.setItem("diet_advisor_favorites", JSON.stringify(newFavs));
        return newFavs;
      });
      
    } catch (error) {
      console.error("Error analyzing nutrition:", error);
    } finally {
      setIsAnalyzingNutrition(prev => ({ ...prev, [recipe.id]: false }));
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "country") {
      setProfile({ ...profile, country: value, state: "" });
    } else {
      setProfile({ ...profile, [name as keyof UserProfile]: value } as UserProfile);
    }
  };

  const handleSaveProfile = () => {
    if (!profile.name.trim()) return;
    
    const existingProfileIndex = savedProfiles.findIndex(p => p.name.toLowerCase() === profile.name.toLowerCase());
    
    if (existingProfileIndex !== -1) {
      setSaveConfirmationOpen(true);
    } else {
      performSaveProfile();
    }
  };

  const performSaveProfile = () => {
    const existingProfileIndex = savedProfiles.findIndex(p => p.name.toLowerCase() === profile.name.toLowerCase());
    let newProfiles;
    
    if (existingProfileIndex !== -1) {
      newProfiles = [...savedProfiles];
      newProfiles[existingProfileIndex] = { ...profile };
    } else {
      newProfiles = [...savedProfiles, { ...profile }];
    }
    
    setSavedProfiles(newProfiles);
    localStorage.setItem("diet_advisor_profiles", JSON.stringify(newProfiles));
    setSaveConfirmationOpen(false);
    setSaveSuccessMessage(`Profile "${profile.name}" saved successfully.`);
    
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3000);
  };

  const toggleFavoritePlan = () => {
    if (!dietPlan) return;
    
    const planId = `${profile.name}_${profile.month}_${profile.planDuration}_${profile.mealScope}`;
    const isFavorite = favoritePlans.some(p => p.id === planId);
    
    let newFavoritePlans;
    if (isFavorite) {
      newFavoritePlans = favoritePlans.filter(p => p.id !== planId);
    } else {
      newFavoritePlans = [...favoritePlans, {
        id: planId,
        plan: dietPlan,
        profile: { ...profile },
        date: new Date().toLocaleDateString()
      }];
    }
    
    setFavoritePlans(newFavoritePlans);
    localStorage.setItem("diet_advisor_favorite_plans", JSON.stringify(newFavoritePlans));
  };

  const handleLoadProfile = (p: UserProfile) => {
    setProfile({
      ...p,
      illnesses: p.illnesses || [],
      allergy: p.allergy || [],
      planDuration: p.planDuration || "Daily",
      mealScope: p.mealScope || "All Meals",
      month: p.month || new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date())
    });
  };

  const handleDeleteProfile = (index: number) => {
    const newProfiles = savedProfiles.filter((_, i) => i !== index);
    setSavedProfiles(newProfiles);
    localStorage.setItem("diet_advisor_profiles", JSON.stringify(newProfiles));
  };

  const handleGeneratePlan = async () => {
    if (!profile.gender || !profile.age || !profile.country || !profile.state || !profile.weight || !profile.height || !profile.width || !profile.goal) {
      setValidationMessage("Please fill in all profile details including your goal.");
      return;
    }
    setIsGeneratingPlan(true);
    try {
      const plan = await generateDietPlan(profile, bmi, bodyFat);
      setDietPlan(plan);
      
      // Save to history
      const historyItem = {
        id: Math.random().toString(36).substr(2, 9),
        plan: plan,
        profile: { ...profile },
        date: new Date().toLocaleString()
      };
      const newHistory = [historyItem, ...planHistory].slice(0, 20); // Keep last 20
      setPlanHistory(newHistory);
      localStorage.setItem("diet_advisor_plan_history", JSON.stringify(newHistory));

      setActiveTab("plan");
      
      // Auto-generate first 3 AI images to show quality
      if (plan.recommendedFoods) {
        plan.recommendedFoods.slice(0, 3).forEach(food => {
          handleGenerateAiFoodImage(food.name);
        });
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        setQuotaModalOpen(true);
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!profile.gender || !profile.age || !profile.country || !profile.state) {
      setValidationMessage("Please fill in basic profile details first.");
      return;
    }
    setIsGeneratingRecipe(true);
    try {
      const recipeData = await generateRecipe(profile);
      const newRecipe: Recipe = {
        ...recipeData,
        id: Math.random().toString(36).substr(2, 9),
      };
      setCurrentRecipe(newRecipe);
      setActiveTab("plan");
    } catch (error) {
      console.error("Error generating recipe:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        setQuotaModalOpen(true);
      }
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const toggleFavorite = (recipe: Recipe) => {
    setFavorites(prev => {
      const isFav = prev.some(r => r.id === recipe.id);
      const newFavs = isFav ? prev.filter(r => r.id !== recipe.id) : [...prev, recipe];
      localStorage.setItem("diet_advisor_favorites", JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;
    setIsAnalyzingImage(true);
    try {
      const info = await analyzeFoodImage(selectedImage);
      setNutritionInfo(info);
      setActiveTab("analyze");
    } catch (error) {
      console.error("Error analyzing image:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        setQuotaModalOpen(true);
      }
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
      {/* Header */}
      <header className="border-b border-slate-200 py-4 px-4 md:px-8 sticky top-0 bg-white/80 backdrop-blur-xl z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-sans font-semibold tracking-tight text-slate-900">Diet Advisor</h1>
          </div>
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            <nav className="flex gap-2 md:gap-4 text-[10px] md:text-xs uppercase tracking-widest font-medium items-center whitespace-nowrap mx-auto md:mx-0">
              <button 
                onClick={handleOpenKeyDialog}
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[10px] font-semibold tracking-wide uppercase",
                  hasApiKey ? "border-green-500/30 text-green-600 bg-green-50" : "border-red-500/30 text-red-600 bg-red-50 hover:bg-red-100"
                )}
              >
                <Key className="w-3 h-3" />
                {hasApiKey ? "API Key Active" : "Quota Limit? Use Your Key"}
              </button>
              <button 
                onClick={() => setActiveTab("home")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all", 
                  activeTab === "home" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Home
              </button>
              <button 
                onClick={() => setActiveTab("plan")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all", 
                  activeTab === "plan" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Diet Plan
              </button>
              <button 
                onClick={() => setActiveTab("analyze")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all", 
                  activeTab === "analyze" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Food Analysis
              </button>
              <button 
                onClick={() => setActiveTab("favorites")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-2", 
                  activeTab === "favorites" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Favorites {(favorites.length + favoritePlans.length) > 0 && (
                  <span className={cn(
                    "w-4 h-4 text-[8px] rounded-full flex items-center justify-center",
                    activeTab === "favorites" ? "bg-white text-slate-900" : "bg-emerald-600 text-white"
                  )}>
                    {favorites.length + favoritePlans.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab("tracker")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-2", 
                  activeTab === "tracker" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Tracker
              </button>
              <button 
                onClick={() => setActiveTab("history")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-2", 
                  activeTab === "history" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                History
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 gap-0 min-h-[calc(100vh-89px)]">
        {/* Left Panel: Inputs */}
        <div className={cn("border border-slate-200 p-6 lg:p-10 overflow-y-auto bg-white shadow-sm rounded-3xl m-4 lg:m-6", activeTab === "home" ? "block" : "hidden")}>
          <div className="space-y-12">
            {/* Profile Section */}
            <section>
              <div className="flex items-center gap-2 mb-8">
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-40">01</span>
                <h2 className="text-xl font-sans font-semibold tracking-tight text-slate-900">Your Profile</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input 
                    type="text" 
                    name="name"
                    placeholder="Enter your name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <User className="w-3 h-3" /> Gender
                  </label>
                  <select 
                    name="gender" 
                    value={profile.gender}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Clock className="w-3 h-3" /> Exact Age
                  </label>
                  <input 
                    type="number" 
                    name="age"
                    placeholder="e.g. 25"
                    value={profile.age}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <MapPin className="w-3 h-3" /> Country
                  </label>
                  <select 
                    name="country" 
                    value={profile.country}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="">Select Country</option>
                    {Object.keys(COUNTRIES_STATES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Globe className="w-3 h-3" /> State/Province
                  </label>
                  <select 
                    name="state" 
                    value={profile.state}
                    onChange={handleProfileChange}
                    disabled={!profile.country}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none disabled:opacity-30"
                  >
                    <option value="">Select State</option>
                    {profile.country && COUNTRIES_STATES[profile.country].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Activity className="w-3 h-3" /> Weight (kg)
                  </label>
                  <input 
                    type="text" 
                    name="weight"
                    placeholder="e.g. 70"
                    value={profile.weight}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Ruler className="w-3 h-3" /> Height (cm)
                  </label>
                  <input 
                    type="text" 
                    name="height"
                    placeholder="e.g. 175"
                    value={profile.height}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Ruler className="w-3 h-3" /> Body Width
                  </label>
                  <input 
                    type="text" 
                    name="width"
                    placeholder="e.g. 45cm"
                    value={profile.width}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Globe className="w-3 h-3" /> Plan Language
                  </label>
                  <select 
                    name="language" 
                    value={profile.language}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English Version">English Version (Direct)</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Clock className="w-3 h-3" /> Plan Duration
                  </label>
                  <select 
                    name="planDuration" 
                    value={profile.planDuration}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="Daily">Daily Plan</option>
                    <option value="Weekly">Weekly Plan</option>
                    <option value="Monthly">Monthly Plan</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Utensils className="w-3 h-3" /> Meal Scope
                  </label>
                  <select 
                    name="mealScope" 
                    value={profile.mealScope}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="All Meals">All Meals (Full Day)</option>
                    <option value="Morning Only">Morning Only</option>
                    <option value="Lunch Only">Lunch Only</option>
                    <option value="Evening Only">Evening Only</option>
                    <option value="Dinner Only">Dinner Only</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Calendar className="w-3 h-3" /> Select Month
                  </label>
                  <select 
                    name="month" 
                    value={profile.month}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Utensils className="w-3 h-3" /> Dietary Preference
                  </label>
                  <select 
                    name="dietaryPreference" 
                    value={profile.dietaryPreference}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="Non-Vegan">Non-Vegan</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Jain">Jain</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Activity className="w-3 h-3" /> Activity Level
                  </label>
                  <select 
                    name="activityLevel" 
                    value={profile.activityLevel}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="Sedentary">Sedentary / Light</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Medium">Medium</option>
                    <option value="Heavy">Heavy</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="space-y-4 md:col-span-2 mt-4">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Allergies
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["Peanuts", "Tree Nuts", "Milk", "Egg", "Wheat", "Soy", "Fish", "Shellfish", "Gluten", "Lactose"].map((allergy) => (
                      <label 
                        key={allergy} 
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-2xl cursor-pointer transition-all text-xs font-medium tracking-wide",
                          profile.allergy.includes(allergy) 
                            ? "bg-emerald-600 text-white border-emerald-600" 
                            : "bg-transparent text-slate-900/40 border-slate-200 hover:border-emerald-600"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={profile.allergy.includes(allergy)}
                          onChange={(e) => {
                            const selectedValues = [...profile.allergy];
                            if (e.target.checked) {
                              selectedValues.push(allergy);
                            } else {
                              const index = selectedValues.indexOf(allergy);
                              if (index > -1) selectedValues.splice(index, 1);
                            }
                            setProfile({ ...profile, allergy: selectedValues });
                          }}
                        />
                        {allergy}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Target className="w-3 h-3" /> Your Goal
                  </label>
                  <select 
                    name="goal" 
                    value={profile.goal}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Muscle Gain">Muscle Gain</option>
                    <option value="Support Energy">Support Energy (Energy Boost)</option>
                    <option value="Better Digestion">Better Digestion (Gut Health)</option>
                    <option value="Healthy Aging">Healthy Aging</option>
                    <option value="Athletic Performance">Athletic Performance</option>
                    <option value="General Wellness">General Wellness</option>
                    <option value="Heart Health">Heart Health</option>
                    <option value="Stress Management">Stress Management</option>
                    <option value="Immunity Boost">Immunity Boost</option>
                  </select>
                </div>

                <div className="space-y-2 group relative">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Candy className="w-3 h-3" /> Taste Preference
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTasteDropdownOpen(!isTasteDropdownOpen)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {profile.tastePreference === "Meetha" && <Candy className="w-3.5 h-3.5 text-pink-400" />}
                        {profile.tastePreference === "Teekha" && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                        {profile.tastePreference === "Namkeen" && <Waves className="w-3.5 h-3.5 text-blue-400" />}
                        {profile.tastePreference === "Meetha-Teekha" && (
                          <div className="flex -space-x-1">
                            <Candy className="w-3.5 h-3.5 text-pink-400" />
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                          </div>
                        )}
                        {profile.tastePreference === "Meetha-Namkeen" && (
                          <div className="flex -space-x-1">
                            <Candy className="w-3.5 h-3.5 text-pink-400" />
                            <Waves className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                        )}
                        {profile.tastePreference === "Teekha-Namkeen" && (
                          <div className="flex -space-x-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            <Waves className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                        )}
                        {profile.tastePreference === "Combo" && <Layers className="w-3.5 h-3.5 text-purple-400" />}
                        <span>
                          {profile.tastePreference === "Meetha" && "Meetha (Sweet)"}
                          {profile.tastePreference === "Teekha" && "Teekha (Spicy)"}
                          {profile.tastePreference === "Namkeen" && "Namkeen (Salty)"}
                          {profile.tastePreference === "Meetha-Teekha" && "Meetha & Teekha"}
                          {profile.tastePreference === "Meetha-Namkeen" && "Meetha & Namkeen"}
                          {profile.tastePreference === "Teekha-Namkeen" && "Teekha & Namkeen"}
                          {profile.tastePreference === "Combo" && "Combo (All-in-One)"}
                        </span>
                      </div>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", isTasteDropdownOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isTasteDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-20 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden"
                        >
                          {[
                            { value: "Meetha", label: "Meetha (Sweet)", icon: <Candy className="w-3.5 h-3.5 text-pink-400" /> },
                            { value: "Teekha", label: "Teekha (Spicy)", icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
                            { value: "Namkeen", label: "Namkeen (Salty)", icon: <Waves className="w-3.5 h-3.5 text-blue-400" /> },
                            { 
                              value: "Meetha-Teekha", 
                              label: "Meetha & Teekha", 
                              icon: (
                                <div className="flex -space-x-1">
                                  <Candy className="w-3 h-3 text-pink-400" />
                                  <Flame className="w-3 h-3 text-orange-500" />
                                </div>
                              ) 
                            },
                            { 
                              value: "Meetha-Namkeen", 
                              label: "Meetha & Namkeen", 
                              icon: (
                                <div className="flex -space-x-1">
                                  <Candy className="w-3 h-3 text-pink-400" />
                                  <Waves className="w-3 h-3 text-blue-400" />
                                </div>
                              ) 
                            },
                            { 
                              value: "Teekha-Namkeen", 
                              label: "Teekha & Namkeen", 
                              icon: (
                                <div className="flex -space-x-1">
                                  <Flame className="w-3 h-3 text-orange-500" />
                                  <Waves className="w-3 h-3 text-blue-400" />
                                </div>
                              ) 
                            },
                            { value: "Combo", label: "Combo (All-in-One)", icon: <Layers className="w-3.5 h-3.5 text-purple-400" /> },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setProfile({ ...profile, tastePreference: opt.value as any });
                                setIsTasteDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full px-4 py-3 text-left text-xs flex items-center gap-3 hover:bg-white shadow-sm rounded-2xl transition-colors",
                                profile.tastePreference === opt.value && "bg-slate-100 font-bold"
                              )}
                            >
                              {opt.icon}
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Heart className="w-3 h-3" /> Marital Status
                  </label>
                  <select 
                    name="maritalStatus" 
                    value={profile.maritalStatus}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Layers className="w-3 h-3" /> Derivative Preference
                  </label>
                  <select 
                    name="derivativePreference" 
                    value={profile.derivativePreference}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Family-friendly">Family-friendly</option>
                    <option value="Single-portion">Single-portion</option>
                    <option value="Quick & Easy">Quick & Easy</option>
                    <option value="Budget-friendly">Budget-friendly</option>
                    <option value="High-Protein Focus">High-Protein Focus</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3" /> Energy Add-on
                  </label>
                  <select 
                    name="energyAddon" 
                    value={profile.energyAddon}
                    onChange={handleProfileChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm appearance-none"
                  >
                    <option value="None">None</option>
                    <option value="Pre-workout">Pre-workout Boost</option>
                    <option value="Post-workout">Post-workout Recovery</option>
                    <option value="Afternoon Boost">Afternoon Energy Boost</option>
                    <option value="Morning Kickstart">Morning Kickstart</option>
                    <option value="Sustained Energy">Sustained Energy (All Day)</option>
                  </select>
                </div>
                <div className="space-y-4 md:col-span-2 mt-4">
                  <label className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Health Conditions / Illnesses
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["Diabetes", "Hypertension (BP)", "Thyroid", "Cholesterol", "PCOD/PCOS", "Uric Acid", "Anemia", "Digestive Issues", "Kidney Issues", "Fatty Liver", "Heart Disease", "Arthritis"].map((illness) => (
                      <label 
                        key={illness} 
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-2xl cursor-pointer transition-all text-xs font-medium tracking-wide",
                          profile.illnesses.includes(illness) 
                            ? "bg-emerald-600 text-white border-emerald-600" 
                            : "bg-transparent text-slate-900/40 border-slate-200 hover:border-emerald-600"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={profile.illnesses.includes(illness)}
                          onChange={(e) => {
                            const selectedValues = [...profile.illnesses];
                            if (e.target.checked) {
                              selectedValues.push(illness);
                            } else {
                              const index = selectedValues.indexOf(illness);
                              if (index > -1) selectedValues.splice(index, 1);
                            }
                            setProfile({ ...profile, illnesses: selectedValues });
                          }}
                        />
                        {illness}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculated Metrics Display */}
              {(bmi > 0 || bodyFat > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-4 bg-white shadow-sm rounded-2xl border border-slate-200 rounded-2xl grid grid-cols-2 gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold tracking-wide uppercase opacity-40">Calculated BMI</p>
                    <p className="text-lg font-sans font-semibold tracking-tight text-slate-900">{bmi.toFixed(1)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold tracking-wide uppercase opacity-40">Est. Body Fat %</p>
                    <p className="text-lg font-sans font-semibold tracking-tight text-slate-900">{bodyFat > 0 ? bodyFat.toFixed(1) : "0.0"}%</p>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4 mt-10">
                <button 
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="flex-1 py-4 bg-emerald-600 text-white text-sm font-semibold tracking-wide rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Plan"}
                </button>
                <button 
                  onClick={handleGenerateRecipe}
                  disabled={isGeneratingRecipe}
                  className="flex-1 py-4 border-2 border-emerald-600 text-emerald-700 text-sm font-semibold tracking-wide rounded-2xl hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {isGeneratingRecipe ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Recipe"}
                </button>
              </div>

              {/* Saved Profiles Section */}
              <div className="mt-12 pt-12 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-medium text-slate-400 mb-1.5">Saved Profiles</h3>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={!profile.name}
                    className="text-xs font-medium tracking-wide text-slate-900 hover:opacity-60 transition-opacity disabled:opacity-20 flex items-center gap-1.5"
                  >
                    <Save className="w-3 h-3" />
                    Save Current
                  </button>
                </div>
                
                {savedProfiles.length === 0 ? (
                  <p className="text-[10px] italic opacity-30">No saved profiles yet.</p>
                ) : (
                  <div className="space-y-2">
                    {savedProfiles.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white shadow-sm rounded-2xl border border-slate-100 rounded-2xl group hover:border-emerald-600 transition-colors">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleLoadProfile(p)}
                        >
                          <p className="text-xs font-bold">{p.name}</p>
                          <p className="text-[8px] uppercase tracking-widest opacity-40">{p.age}y • {p.weight}kg • {p.height}cm</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProfile(idx);
                          }}
                          className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-2 text-red-600"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="bg-white p-8 lg:p-16 overflow-y-auto lg:col-span-12">
          {activeTab === "home" && (
            <div className="space-y-12 mb-12">
              {/* Profile Section */}
              <section>
                <div className="flex items-center gap-2 mb-8">
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-40">01</span>
                  <h2 className="text-xl font-sans font-semibold tracking-tight text-slate-900">Your Profile</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* ... profile inputs ... */}
                  {/* I will need to copy the profile inputs here */}
                </div>
              </section>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic prose-headings:font-normal prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 h-full"
            >
              {activeTab === "plan" && (
                <>
                  {!dietPlan && !currentRecipe && !isGeneratingPlan && !isGeneratingRecipe ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto pt-20">
                      <div className="w-16 h-16 border border-slate-200 rounded-full flex items-center justify-center mb-8">
                        <Utensils className="w-6 h-6 opacity-20" />
                      </div>
                      <h3 className="text-2xl font-sans font-semibold tracking-tight text-slate-900 mb-4">Your personalized guide awaits.</h3>
                      <p className="text-sm leading-relaxed opacity-40">
                        Fill in your profile to receive a custom diet plan tailored to your lifestyle.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h2 className="text-3xl font-sans font-semibold tracking-tight text-slate-900 m-0">Your Personalized Plan</h2>
                        {dietPlan && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button 
                              onClick={handleDownloadPDF}
                              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 hover:border-emerald-600 transition-all text-xs font-medium tracking-wide text-slate-900"
                            >
                              <Download className="w-3 h-3" />
                              <span className="hidden sm:inline">Download PDF</span>
                            </button>
                            <button 
                              onClick={handleSharePDF}
                              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 hover:border-emerald-600 transition-all text-xs font-medium tracking-wide text-slate-900"
                            >
                              <Share2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Share</span>
                            </button>
                            <button 
                              onClick={handleShareToWhatsAppWeb}
                              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 hover:border-emerald-600 transition-all text-xs font-medium tracking-wide text-slate-900"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                            <button 
                              onClick={toggleFavoritePlan}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-medium tracking-wide",
                                favoritePlans.some(p => p.id === `${profile.name}_${profile.month}_${profile.planDuration}_${profile.mealScope}`)
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-transparent text-slate-900 border-slate-200 hover:border-emerald-600"
                              )}
                            >
                              <Heart className={cn("w-3 h-3", favoritePlans.some(p => p.id === `${profile.name}_${profile.month}_${profile.planDuration}_${profile.mealScope}`) && "fill-current")} />
                              <span className="hidden sm:inline">{favoritePlans.some(p => p.id === `${profile.name}_${profile.month}_${profile.planDuration}_${profile.mealScope}`) ? "Favorited" : "Add to Favorites"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-12" id="diet-report">
                        {(isGeneratingPlan || isGeneratingRecipe) && (
                          <div className="py-20 flex flex-col items-center justify-center text-center">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-20" />
                            <p className="text-xs font-medium text-slate-400 mb-1.5">
                              {isGeneratingPlan ? "Generating your custom plan..." : "Creating recipe..."}
                            </p>
                          </div>
                        )}
                        {!isGeneratingPlan && dietPlan && (
                      <div className="space-y-12">
                        <div className="markdown-content prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic prose-headings:font-normal prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
                          <ReactMarkdown
                            components={{
                              h3: ({node, ...props}) => {
                                const isWarning = props.children?.toString().includes('⚠️');
                                return <h3 className={isWarning ? 'warning-heading' : ''} {...props} />;
                              }
                            }}
                          >
                            {dietPlan.planMarkdown}
                          </ReactMarkdown>
                        </div>

                        <div className="p-4 bg-red-50/30 border border-red-100 rounded-2xl flex gap-3 mt-8">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] leading-relaxed text-red-800/70 italic">
                            <strong>Medical Disclaimer:</strong> This AI-generated diet plan is for informational and educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                          </p>
                        </div>

                        {dietPlan.recommendedFoods && dietPlan.recommendedFoods.length > 0 && (
                          <div className="space-y-8 pt-12 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                                  <Sparkles className="text-white w-4 h-4" />
                                </div>
                                <h3 className="text-2xl font-sans font-semibold tracking-tight text-slate-900">Recommended Foods Gallery</h3>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-medium tracking-wide opacity-30">AI Generated Reference</span>
                              </div>
                            </div>
                            <p className="text-sm opacity-40 max-w-md">
                              Click on any food item to generate a high-quality AI reference image. We've automatically generated the first 3 for you.
                            </p>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                              {dietPlan.recommendedFoods.map((food, idx) => (
                                <motion.div 
                                  key={idx}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.01 }}
                                  className="group relative aspect-square bg-white shadow-sm rounded-2xl border border-slate-200 rounded-2xl overflow-hidden cursor-pointer"
                                  onClick={() => handleGenerateAiFoodImage(food.name)}
                                >
                                  {aiImages[food.name] ? (
                                    <img 
                                      src={aiImages[food.name]}
                                      alt={food.name}
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
                                      {isGeneratingAiImage[food.name] ? (
                                        <Loader2 className="w-5 h-5 animate-spin opacity-20" />
                                      ) : (
                                        <div className="flex flex-col items-center gap-2">
                                          <Camera className="w-4 h-4 opacity-10 group-hover:opacity-40 transition-opacity" />
                                          <span className="text-[10px] font-semibold tracking-wide uppercase opacity-20 group-hover:opacity-60 transition-opacity">
                                            {aiImages[food.name] === undefined && isGeneratingAiImage[food.name] === false && lastQuotaErrorTime.current > 0 ? "Retry AI Image" : "Generate AI Image"}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <span className="text-[8px] text-white/60 uppercase tracking-widest font-bold mb-1">Item {idx + 1}</span>
                                    <p className="text-[10px] text-white font-medium leading-tight">{food.name}</p>
                                  </div>
                                  
                                  {aiImages[food.name] && (
                                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!isGeneratingRecipe && currentRecipe && (
                      <div className="mt-12">
                        <h3 className="text-2xl font-sans font-semibold tracking-tight text-slate-900 mb-6">Featured Recipe</h3>
                        <RecipeCard 
                          recipe={currentRecipe} 
                          isFavorite={favorites.some(f => f.id === currentRecipe.id)}
                          onToggleFavorite={toggleFavorite}
                          imageUrl={aiImages[currentRecipe.title]}
                          onGenerateImage={handleGenerateAiFoodImage}
                          isGeneratingImage={isGeneratingAiImage[currentRecipe.title]}
                          onAnalyzeNutrition={handleAnalyzeNutrition}
                          isAnalyzingNutrition={isAnalyzingNutrition[currentRecipe.id]}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "analyze" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-sans font-semibold tracking-tight text-slate-900 m-0">Food Analysis</h2>
                    </div>
                    {!nutritionInfo && !isAnalyzingImage && (
                      <div className="max-w-xl">
                        <h3 className="text-xl font-sans font-semibold tracking-tight text-slate-900 mb-4">Upload a photo to analyze nutrition</h3>
                        <p className="text-sm opacity-60 mb-8 leading-relaxed">
                          Our AI will identify the food items, estimate portion sizes, and provide a detailed nutritional breakdown including calories, macros, and health insights.
                        </p>
                        
                        <motion.div 
                          whileHover={{ scale: 1.005 }}
                          onClick={() => fileInputRef.current?.click()}
                          className="group relative aspect-video border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-600 transition-all overflow-hidden bg-white shadow-sm rounded-2xl"
                        >
                          {selectedImage ? (
                            <>
                              <img src={selectedImage} alt="Selected food" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white text-xs font-medium tracking-wide">Change Image</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 mb-3 opacity-20 group-hover:opacity-100 transition-all group-hover:-translate-y-1" />
                              <p className="text-xs font-medium text-slate-400 mb-1.5 group-hover:opacity-100 transition-opacity">Upload Food Photo</p>
                            </>
                          )}
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </motion.div>

                        <motion.button 
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={handleAnalyzeImage}
                          disabled={!selectedImage || isAnalyzingImage}
                          className="mt-6 w-full py-4 bg-emerald-600 text-white text-sm font-semibold tracking-wide hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-sm hover:shadow-md"
                        >
                          {isAnalyzingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze Nutrition"}
                        </motion.button>
                      </div>
                    )}

                    {isAnalyzingImage && (
                      <div className="py-20 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-20" />
                        <p className="text-xs font-medium text-slate-400 mb-1.5">Analyzing your meal...</p>
                      </div>
                    )}

                    {nutritionInfo && !isAnalyzingImage && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative"
                      >
                        <div className="flex justify-end mb-4">
                          <button 
                            onClick={() => { setNutritionInfo(null); setSelectedImage(null); }}
                            className="text-xs font-medium text-slate-400 mb-1.5 hover:opacity-100 transition-opacity"
                          >
                            ← Analyze Another
                          </button>
                        </div>
                        <div className="bg-white shadow-sm rounded-2xl p-8 border border-slate-100 rounded-2xl markdown-content">
                          <ReactMarkdown
                            components={{
                              h3: ({node, ...props}) => {
                                const isWarning = props.children?.toString().includes('⚠️');
                                return <h3 className={isWarning ? 'warning-heading' : ''} {...props} />;
                              }
                            }}
                          >
                            {nutritionInfo}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {activeTab === "favorites" && (
                  <div className="space-y-12">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-sans font-semibold tracking-tight text-slate-900 m-0">Saved Favorites</h2>
                    </div>
                    {favoritePlans.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-xs font-medium text-slate-400 mb-1.5">Saved Diet Plans</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {favoritePlans.map((fp) => (
                            <div 
                              key={fp.id}
                              className="p-6 bg-white shadow-sm rounded-2xl border border-slate-100 rounded-2xl group hover:border-emerald-600 transition-all cursor-pointer"
                              onClick={() => {
                                setDietPlan(fp.plan);
                                handleLoadProfile(fp.profile);
                                setActiveTab("plan");
                              }}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="text-lg font-sans font-semibold tracking-tight text-slate-900 m-0">{fp.profile.name}'s Plan</p>
                                  <p className="text-[8px] uppercase tracking-widest opacity-40 mt-1">{fp.profile.planDuration} • {fp.profile.mealScope} • {fp.profile.month} • {fp.date}</p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newFavoritePlans = favoritePlans.filter(p => p.id !== fp.id);
                                    setFavoritePlans(newFavoritePlans);
                                    localStorage.setItem("diet_advisor_favorite_plans", JSON.stringify(newFavoritePlans));
                                  }}
                                  className="text-slate-900/40 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-[10px] opacity-60 line-clamp-2">{fp.plan.planMarkdown.substring(0, 100)}...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {favorites.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-xs font-medium text-slate-400 mb-1.5">Saved Recipes</h3>
                        <div className="grid grid-cols-1 gap-8">
                          {favorites.map(recipe => (
                            <RecipeCard 
                              key={recipe.id}
                              recipe={recipe}
                              isFavorite={true}
                              onToggleFavorite={toggleFavorite}
                              imageUrl={aiImages[recipe.title]}
                              onGenerateImage={handleGenerateAiFoodImage}
                              isGeneratingImage={isGeneratingAiImage[recipe.title]}
                              onAnalyzeNutrition={handleAnalyzeNutrition}
                              isAnalyzingNutrition={isAnalyzingNutrition[recipe.id]}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {favoritePlans.length === 0 && favorites.length === 0 && (
                      <div className="py-20 text-center opacity-30">
                        <Heart className="w-12 h-12 mx-auto mb-4" />
                        <p className="font-sans font-semibold tracking-tight text-slate-900 text-xl">No favorites saved yet</p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "tracker" && (
                <div className="h-full flex flex-col pt-10">
                  <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                      <Droplets className="text-white w-5 h-5" />
                    </div>
                    <h2 className="text-3xl font-sans font-semibold tracking-tight text-slate-900 m-0">Daily Water Tracker</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="p-8 bg-white shadow-sm rounded-2xl border border-slate-200 rounded-2xl text-center">
                        <p className="text-xs font-medium text-slate-400 mb-1.5 mb-4">Current Intake</p>
                        <div className="flex items-center justify-center gap-8">
                          <button 
                            onClick={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                            className="w-12 h-12 border border-slate-200 rounded-full flex items-center justify-center hover:border-emerald-600 transition-all"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <div className="space-y-1">
                            <p className="text-5xl font-sans font-semibold tracking-tight text-slate-900">{waterIntake}</p>
                            <p className="text-xs font-medium text-slate-400 mb-1.5">Glasses</p>
                          </div>
                          <button 
                            onClick={() => setWaterIntake(waterIntake + 1)}
                            className="w-12 h-12 border border-slate-200 rounded-full flex items-center justify-center hover:border-emerald-600 transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <p className="text-xs font-medium text-slate-400 mb-1.5">Daily Goal</p>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={waterGoal}
                              onChange={(e) => setWaterGoal(parseInt(e.target.value) || 0)}
                              className="w-12 bg-transparent border-b-2 border-slate-200 text-center font-sans font-semibold tracking-tight text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                            />
                            <span className="text-xs font-medium text-slate-400 mb-1.5">Glasses</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (waterIntake / (waterGoal || 1)) * 100)}%` }}
                            className="h-full bg-emerald-600"
                          />
                        </div>
                        <p className="text-[10px] italic opacity-40 text-right">
                          {waterIntake >= waterGoal ? "Goal reached! Stay hydrated." : `${waterGoal - waterIntake} more glasses to reach your goal.`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-sm font-bold uppercase tracking-widest">Why Hydration Matters</h4>
                      <ul className="space-y-4">
                        <li className="flex gap-3 text-sm leading-relaxed opacity-60">
                          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0" />
                          <span>Boosts energy levels and brain function.</span>
                        </li>
                        <li className="flex gap-3 text-sm leading-relaxed opacity-60">
                          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0" />
                          <span>Aids in digestion and weight management.</span>
                        </li>
                        <li className="flex gap-3 text-sm leading-relaxed opacity-60">
                          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0" />
                          <span>Improves skin health and complexion.</span>
                        </li>
                        <li className="flex gap-3 text-sm leading-relaxed opacity-60">
                          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mt-1.5 flex-shrink-0" />
                          <span>Regulates body temperature and joint lubrication.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "history" && (
                <div className="space-y-12 pt-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                        <History className="text-white w-5 h-5" />
                      </div>
                      <h2 className="text-3xl font-sans font-semibold tracking-tight text-slate-900 m-0">Generation History</h2>
                    </div>
                    {planHistory.length > 0 && (
                      <button 
                        onClick={() => {
                          if (confirm("Are you sure you want to clear your entire generation history?")) {
                            setPlanHistory([]);
                            localStorage.removeItem("diet_advisor_plan_history");
                          }
                        }}
                        className="text-xs font-medium text-slate-400 mb-1.5 hover:opacity-100 transition-opacity flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Clear All
                      </button>
                    )}
                  </div>

                  {planHistory.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {planHistory.map((item) => (
                        <div 
                          key={item.id}
                          className="p-6 bg-white shadow-sm rounded-2xl border border-slate-100 rounded-2xl group hover:border-emerald-600 transition-all cursor-pointer relative"
                          onClick={() => {
                            setDietPlan(item.plan);
                            handleLoadProfile(item.profile);
                            setActiveTab("plan");
                          }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-lg font-sans font-semibold tracking-tight text-slate-900 m-0">{item.profile.name || "Guest"}'s Plan</p>
                              <p className="text-[8px] uppercase tracking-widest opacity-40 mt-1">{item.profile.planDuration} • {item.profile.goal} • {item.date}</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newHistory = planHistory.filter(h => h.id !== item.id);
                                setPlanHistory(newHistory);
                                localStorage.setItem("diet_advisor_plan_history", JSON.stringify(newHistory));
                              }}
                              className="text-slate-900/40 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] opacity-60 line-clamp-3 leading-relaxed">
                              {item.plan.planMarkdown.substring(0, 150)}...
                            </p>
                            <div className="flex flex-wrap gap-1 pt-2">
                              {item.profile.illnesses && item.profile.illnesses.slice(0, 2).map(ill => (
                                <span key={ill} className="px-2 py-0.5 bg-red-50 text-red-600 text-[7px] uppercase tracking-widest font-bold rounded-full">
                                  {ill}
                                </span>
                              ))}
                              {item.profile.illnesses && item.profile.illnesses.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[7px] uppercase tracking-widest font-bold rounded-full">
                                  +{item.profile.illnesses.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center opacity-30 border border-dashed border-slate-200 rounded-2xl">
                      <History className="w-12 h-12 mx-auto mb-4" />
                      <p className="font-sans font-semibold tracking-tight text-slate-900 text-xl">No history yet</p>
                      <p className="text-xs font-medium tracking-wide mt-2">Generate a plan to see it here</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 opacity-20" />
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-40">© 2026 Diet Advisor</p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Powered By</p>
              <p className="text-xs font-sans font-semibold tracking-tight text-slate-900">Google Gemini AI</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Design</p>
              <p className="text-xs font-sans font-semibold tracking-tight text-slate-900">Classic Minimalist</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Validation Modal */}
      <AnimatePresence>
        {validationMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full"
            >
              <h3 className="text-lg font-sans font-semibold tracking-tight text-slate-900 mb-2">Notice</h3>
              <p className="text-sm opacity-70 mb-6">{validationMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setValidationMessage(null)}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs uppercase tracking-widest font-bold rounded-2xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quota Modal */}
      <AnimatePresence>
        {quotaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full"
            >
              <h3 className="text-lg font-sans font-semibold tracking-tight text-slate-900 mb-2 text-red-600">Quota Exceeded</h3>
              <p className="text-sm opacity-70 mb-6">
                AI generation quota exceeded. Would you like to use your own Gemini API key to continue? (Requires a paid Google Cloud project)
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setQuotaModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-900 text-xs uppercase tracking-widest font-bold rounded-2xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setQuotaModalOpen(false);
                    handleOpenKeyDialog();
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs uppercase tracking-widest font-bold rounded-2xl"
                >
                  Use My Key
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Confirmation Modal */}
      <AnimatePresence>
        {saveConfirmationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-6 text-orange-500">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-sans font-semibold tracking-tight text-slate-900">Overwrite Profile?</h3>
              </div>
              <p className="text-sm leading-relaxed opacity-60 mb-8">
                A profile with the name <span className="font-bold text-slate-900">"{profile.name}"</span> already exists. Do you want to overwrite it with the current data?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={performSaveProfile}
                  className="w-full py-3 bg-emerald-600 text-white text-xs font-medium tracking-wide rounded-2xl hover:bg-emerald-700 transition-colors"
                >
                  Yes, Overwrite
                </button>
                <button
                  onClick={() => setSaveConfirmationOpen(false)}
                  className="w-full py-3 border border-slate-200 text-slate-900 text-xs font-medium tracking-wide rounded-2xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {saveSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 min-w-[300px]"
          >
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-xs font-bold uppercase tracking-widest">{saveSuccessMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
