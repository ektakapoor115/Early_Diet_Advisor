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
  Key
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
    planType: "Daily",
    illnesses: [],
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date()),
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "analyze" | "favorites">("plan");
  const [aiImages, setAiImages] = useState<Record<string, string>>({});
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState<Record<string, boolean>>({});
  const [hasApiKey, setHasApiKey] = useState(false);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
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
            #diet-report, [id^="recipe-"], #diet-report *, [id^="recipe-"] * {
              color: #1A1A1A !important;
              border-color: #E6E6E6 !important;
            }
            #diet-report, [id^="recipe-"] {
              background-color: #ffffff !important;
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
            #diet-report, [id^="recipe-"], #diet-report *, [id^="recipe-"] * {
              color: #1A1A1A !important;
              border-color: #E6E6E6 !important;
            }
            #diet-report, [id^="recipe-"] {
              background-color: #ffffff !important;
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
    
    // Generate and download the PDF first
    const file = await generateDietPDFBlob();
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }

    const text = `Check out my personalized diet plan from Early Diet Advisor! (Please see the attached PDF)\n\nLocation: ${profile.state}, ${profile.country}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSharePDF = async () => {
    if (!dietPlan) return;
    
    const file = await generateDietPDFBlob();
    if (!file) return;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'My Personalized Diet Plan',
          text: 'Check out my personalized diet plan from Early Diet Advisor!'
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
    const newProfiles = [...savedProfiles, { ...profile }];
    setSavedProfiles(newProfiles);
    localStorage.setItem("diet_advisor_profiles", JSON.stringify(newProfiles));
  };

  const toggleFavoritePlan = () => {
    if (!dietPlan) return;
    
    const planId = `${profile.name}_${profile.month}_${profile.planType}`;
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
      planType: p.planType || "Daily",
      month: p.month || new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date())
    });
  };

  const handleDeleteProfile = (index: number) => {
    const newProfiles = savedProfiles.filter((_, i) => i !== index);
    setSavedProfiles(newProfiles);
    localStorage.setItem("diet_advisor_profiles", JSON.stringify(newProfiles));
  };

  const handleGeneratePlan = async () => {
    if (!profile.gender || !profile.age || !profile.country || !profile.state || !profile.weight || !profile.height || !profile.width) {
      setValidationMessage("Please fill in all profile details.");
      return;
    }
    setIsGeneratingPlan(true);
    try {
      const plan = await generateDietPlan(profile, bmi, bodyFat);
      setDietPlan(plan);
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
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#E6E6E6]">
      {/* Header */}
      <header className="border-b border-[#E6E6E6] py-4 md:py-6 px-4 md:px-8 sticky top-0 bg-[#FDFCFB]/80 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-serif italic tracking-tight">Early Diet Advisor</h1>
          </div>
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            <nav className="flex gap-2 md:gap-4 text-[10px] md:text-xs uppercase tracking-widest font-medium items-center whitespace-nowrap mx-auto md:mx-0">
              <button 
                onClick={handleOpenKeyDialog}
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[8px] uppercase tracking-widest font-bold",
                  hasApiKey ? "border-green-500/30 text-green-600 bg-green-50" : "border-red-500/30 text-red-600 bg-red-50 hover:bg-red-100"
                )}
              >
                <Key className="w-3 h-3" />
                {hasApiKey ? "API Key Active" : "Quota Limit? Use Your Key"}
              </button>
              <button 
                onClick={() => setActiveTab("plan")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all", 
                  activeTab === "plan" ? "bg-[#1A1A1A] text-white opacity-100" : "hover:bg-[#F0F0F0] opacity-70"
                )}
              >
                Diet Plan
              </button>
              <button 
                onClick={() => setActiveTab("analyze")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all", 
                  activeTab === "analyze" ? "bg-[#1A1A1A] text-white opacity-100" : "hover:bg-[#F0F0F0] opacity-70"
                )}
              >
                Food Analysis
              </button>
              <button 
                onClick={() => setActiveTab("favorites")} 
                className={cn(
                  "px-4 py-2 rounded-full transition-all flex items-center gap-2", 
                  activeTab === "favorites" ? "bg-[#1A1A1A] text-white opacity-100" : "hover:bg-[#F0F0F0] opacity-70"
                )}
              >
                Favorites {(favorites.length + favoritePlans.length) > 0 && (
                  <span className={cn(
                    "w-4 h-4 text-[8px] rounded-full flex items-center justify-center",
                    activeTab === "favorites" ? "bg-white text-[#1A1A1A]" : "bg-[#1A1A1A] text-white"
                  )}>
                    {favorites.length + favoritePlans.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-89px)]">
        {/* Left Panel: Inputs */}
        <div className="lg:col-span-5 border-r border-[#E6E6E6] p-8 lg:p-12 overflow-y-auto">
          <div className="space-y-12">
            {/* Profile Section */}
            <section>
              <div className="flex items-center gap-2 mb-8">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">01</span>
                <h2 className="text-xl font-serif italic">Your Profile</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input 
                    type="text" 
                    name="name"
                    placeholder="Enter your name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all placeholder:opacity-30 focus:pl-1"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <User className="w-3 h-3" /> Gender
                  </label>
                  <select 
                    name="gender" 
                    value={profile.gender}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all appearance-none focus:pl-1"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Activity className="w-3 h-3" /> Exact Age
                  </label>
                  <input 
                    type="number" 
                    name="age"
                    placeholder="e.g. 25"
                    value={profile.age}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all placeholder:opacity-30 focus:pl-1"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <MapPin className="w-3 h-3" /> Country
                  </label>
                  <select 
                    name="country" 
                    value={profile.country}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all appearance-none focus:pl-1"
                  >
                    <option value="">Select Country</option>
                    {Object.keys(COUNTRIES_STATES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <MapPin className="w-3 h-3" /> State/Province
                  </label>
                  <select 
                    name="state" 
                    value={profile.state}
                    onChange={handleProfileChange}
                    disabled={!profile.country}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all appearance-none focus:pl-1 disabled:opacity-30"
                  >
                    <option value="">Select State</option>
                    {profile.country && COUNTRIES_STATES[profile.country].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Activity className="w-3 h-3" /> Weight (kg)
                  </label>
                  <input 
                    type="text" 
                    name="weight"
                    placeholder="e.g. 70"
                    value={profile.weight}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all placeholder:opacity-30 focus:pl-1"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Activity className="w-3 h-3" /> Height (cm)
                  </label>
                  <input 
                    type="text" 
                    name="height"
                    placeholder="e.g. 175"
                    value={profile.height}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all placeholder:opacity-30 focus:pl-1"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Activity className="w-3 h-3" /> Body Width
                  </label>
                  <input 
                    type="text" 
                    name="width"
                    placeholder="e.g. 45cm"
                    value={profile.width}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all placeholder:opacity-30 focus:pl-1"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3" /> Plan Language
                  </label>
                  <select 
                    name="language" 
                    value={profile.language}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all appearance-none focus:pl-1"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English Version">English Version (Direct)</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Clock className="w-3 h-3" /> Plan Type / Time
                  </label>
                  <select 
                    name="planType" 
                    value={profile.planType}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all appearance-none focus:pl-1"
                  >
                    <option value="Daily">Daily Plan</option>
                    <option value="Weekly">Weekly Plan</option>
                    <option value="Monthly">Monthly Plan</option>
                    <option value="Morning">Morning Only</option>
                    <option value="Evening">Evening Only</option>
                    <option value="Night">Night Only</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2 group-focus-within:opacity-100 transition-opacity">
                    <Globe className="w-3 h-3" /> Select Month
                  </label>
                  <select 
                    name="month" 
                    value={profile.month}
                    onChange={handleProfileChange}
                    className="w-full bg-transparent border-b border-[#E6E6E6] py-2 focus:border-[#1A1A1A] outline-none transition-all appearance-none focus:pl-1"
                  >
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 md:col-span-2 mt-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Health Conditions / Illnesses (Select Multiple)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {["Diabetes", "BP", "Thyroid", "Cholesterol", "PCOD/PCOS", "Uric Acid", "Anemia", "Digestive Issues"].map((illness) => (
                      <button
                        key={illness}
                        onClick={() => {
                          const currentIllnesses = profile.illnesses || [];
                          const newIllnesses = currentIllnesses.includes(illness)
                            ? currentIllnesses.filter(i => i !== illness)
                            : [...currentIllnesses, illness];
                          setProfile({ ...profile, illnesses: newIllnesses });
                        }}
                        className={cn(
                          "px-4 py-2 text-[10px] uppercase tracking-widest font-bold border rounded-sm transition-all flex items-center justify-between",
                          (profile.illnesses || []).includes(illness)
                            ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                            : "bg-transparent text-[#1A1A1A]/40 border-[#E6E6E6] hover:border-[#1A1A1A]"
                        )}
                      >
                        {illness}
                        {(profile.illnesses || []).includes(illness) && <Check className="w-3 h-3 ml-2" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculated Metrics Display */}
              {(bmi > 0 || bodyFat > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-4 bg-[#FAFAFA] border border-[#E6E6E6] rounded-sm grid grid-cols-2 gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40">Calculated BMI</p>
                    <p className="text-lg font-serif italic">{bmi.toFixed(1)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] uppercase tracking-widest font-bold opacity-40">Est. Body Fat %</p>
                    <p className="text-lg font-serif italic">{bodyFat > 0 ? bodyFat.toFixed(1) : "0.0"}%</p>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4 mt-10">
                <button 
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="flex-1 py-4 bg-[#1A1A1A] text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-[#333] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  {isGeneratingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Plan"}
                </button>
                <button 
                  onClick={handleGenerateRecipe}
                  disabled={isGeneratingRecipe}
                  className="flex-1 py-4 border border-[#1A1A1A] text-[#1A1A1A] text-xs uppercase tracking-[0.2em] font-bold hover:bg-[#1A1A1A] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-sm hover:shadow-md"
                >
                  {isGeneratingRecipe ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Recipe"}
                </button>
              </div>

              {/* Saved Profiles Section */}
              <div className="mt-12 pt-12 border-t border-[#F0F0F0]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-40">Saved Profiles</h3>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={!profile.name}
                    className="text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] hover:opacity-60 transition-opacity disabled:opacity-20"
                  >
                    + Save Current
                  </button>
                </div>
                
                {savedProfiles.length === 0 ? (
                  <p className="text-[10px] italic opacity-30">No saved profiles yet.</p>
                ) : (
                  <div className="space-y-2">
                    {savedProfiles.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#FAFAFA] border border-[#F0F0F0] rounded-sm group hover:border-[#1A1A1A] transition-colors">
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
        <div className="lg:col-span-7 bg-white p-8 lg:p-16 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic prose-headings:font-normal prose-p:text-[#1A1A1A]/70 prose-p:leading-relaxed prose-li:text-[#1A1A1A]/70 h-full"
            >
              {activeTab === "plan" && (
                <>
                  {!dietPlan && !currentRecipe && !isGeneratingPlan && !isGeneratingRecipe ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto pt-20">
                      <div className="w-16 h-16 border border-[#E6E6E6] rounded-full flex items-center justify-center mb-8">
                        <Utensils className="w-6 h-6 opacity-20" />
                      </div>
                      <h3 className="text-2xl font-serif italic mb-4">Your personalized guide awaits.</h3>
                      <p className="text-sm leading-relaxed opacity-40">
                        Fill in your profile to receive a custom diet plan tailored to your lifestyle.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h2 className="text-3xl font-serif italic m-0">Your Personalized Plan</h2>
                        {dietPlan && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button 
                              onClick={handleDownloadPDF}
                              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E6E6E6] hover:border-[#1A1A1A] transition-all text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]"
                            >
                              <Download className="w-3 h-3" />
                              <span className="hidden sm:inline">Download PDF</span>
                            </button>
                            <button 
                              onClick={handleSharePDF}
                              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E6E6E6] hover:border-[#1A1A1A] transition-all text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]"
                            >
                              <Share2 className="w-3 h-3" />
                              <span className="hidden sm:inline">Share</span>
                            </button>
                            <button 
                              onClick={handleShareToWhatsAppWeb}
                              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E6E6E6] hover:border-[#1A1A1A] transition-all text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                            <button 
                              onClick={toggleFavoritePlan}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[10px] uppercase tracking-widest font-bold",
                                favoritePlans.some(p => p.id === `${profile.name}_${profile.month}_${profile.planType}`)
                                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                                  : "bg-transparent text-[#1A1A1A] border-[#E6E6E6] hover:border-[#1A1A1A]"
                              )}
                            >
                              <Heart className={cn("w-3 h-3", favoritePlans.some(p => p.id === `${profile.name}_${profile.month}_${profile.planType}`) && "fill-current")} />
                              <span className="hidden sm:inline">{favoritePlans.some(p => p.id === `${profile.name}_${profile.month}_${profile.planType}`) ? "Favorited" : "Add to Favorites"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-12" id="diet-report">
                        {(isGeneratingPlan || isGeneratingRecipe) && (
                          <div className="py-20 flex flex-col items-center justify-center text-center">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-20" />
                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                              {isGeneratingPlan ? "Generating your custom plan..." : "Creating recipe..."}
                            </p>
                          </div>
                        )}
                        {!isGeneratingPlan && dietPlan && (
                      <div className="space-y-12">
                        <div className="markdown-content prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic prose-headings:font-normal prose-p:text-[#1A1A1A]/70 prose-p:leading-relaxed prose-li:text-[#1A1A1A]/70">
                          <ReactMarkdown>{dietPlan.planMarkdown}</ReactMarkdown>
                        </div>

                        {dietPlan.recommendedFoods && dietPlan.recommendedFoods.length > 0 && (
                          <div className="space-y-8 pt-12 border-t border-[#E6E6E6]">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center">
                                  <Sparkles className="text-white w-4 h-4" />
                                </div>
                                <h3 className="text-2xl font-serif italic">Recommended Foods Gallery</h3>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">AI Generated Reference</span>
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
                                  className="group relative aspect-square bg-[#FAFAFA] border border-[#E6E6E6] rounded-sm overflow-hidden cursor-pointer"
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
                                          <span className="text-[8px] uppercase tracking-widest font-bold opacity-20 group-hover:opacity-60 transition-opacity">
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
                        <h3 className="text-2xl font-serif italic mb-6">Featured Recipe</h3>
                        <RecipeCard 
                          recipe={currentRecipe} 
                          isFavorite={favorites.some(f => f.id === currentRecipe.id)}
                          onToggleFavorite={toggleFavorite}
                          imageUrl={aiImages[currentRecipe.title]}
                          onGenerateImage={handleGenerateAiFoodImage}
                          isGeneratingImage={isGeneratingAiImage[currentRecipe.title]}
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
                      <h2 className="text-3xl font-serif italic m-0">Food Analysis</h2>
                    </div>
                    {!nutritionInfo && !isAnalyzingImage && (
                      <div className="max-w-xl">
                        <h3 className="text-xl font-serif italic mb-4">Upload a photo to analyze nutrition</h3>
                        <p className="text-sm opacity-60 mb-8 leading-relaxed">
                          Our AI will identify the food items, estimate portion sizes, and provide a detailed nutritional breakdown including calories, macros, and health insights.
                        </p>
                        
                        <motion.div 
                          whileHover={{ scale: 1.005 }}
                          onClick={() => fileInputRef.current?.click()}
                          className="group relative aspect-video border border-dashed border-[#E6E6E6] rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-[#1A1A1A] transition-all overflow-hidden bg-[#FAFAFA]"
                        >
                          {selectedImage ? (
                            <>
                              <img src={selectedImage} alt="Selected food" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white text-[10px] uppercase tracking-widest font-bold">Change Image</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 mb-3 opacity-20 group-hover:opacity-100 transition-all group-hover:-translate-y-1" />
                              <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 group-hover:opacity-100 transition-opacity">Upload Food Photo</p>
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
                          className="mt-6 w-full py-4 bg-[#1A1A1A] text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-[#333] transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-sm hover:shadow-md"
                        >
                          {isAnalyzingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze Nutrition"}
                        </motion.button>
                      </div>
                    )}

                    {isAnalyzingImage && (
                      <div className="py-20 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-20" />
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Analyzing your meal...</p>
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
                            className="text-[10px] uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
                          >
                            ← Analyze Another
                          </button>
                        </div>
                        <div className="bg-[#FAFAFA] p-8 border border-[#F0F0F0] rounded-sm markdown-content">
                          <ReactMarkdown>{nutritionInfo}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {activeTab === "favorites" && (
                  <div className="space-y-12">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-serif italic m-0">Saved Favorites</h2>
                    </div>
                    {favoritePlans.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-40">Saved Diet Plans</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {favoritePlans.map((fp) => (
                            <div 
                              key={fp.id}
                              className="p-6 bg-[#FAFAFA] border border-[#F0F0F0] rounded-sm group hover:border-[#1A1A1A] transition-all cursor-pointer"
                              onClick={() => {
                                setDietPlan(fp.plan);
                                setProfile(fp.profile);
                                setActiveTab("plan");
                              }}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <p className="text-lg font-serif italic m-0">{fp.profile.name}'s Plan</p>
                                  <p className="text-[8px] uppercase tracking-widest opacity-40 mt-1">{fp.profile.planType} • {fp.profile.month} • {fp.date}</p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newFavoritePlans = favoritePlans.filter(p => p.id !== fp.id);
                                    setFavoritePlans(newFavoritePlans);
                                    localStorage.setItem("diet_advisor_favorite_plans", JSON.stringify(newFavoritePlans));
                                  }}
                                  className="text-[#1A1A1A]/40 hover:text-red-600 transition-colors"
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
                        <h3 className="text-[10px] uppercase tracking-widest font-bold opacity-40">Saved Recipes</h3>
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
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {favoritePlans.length === 0 && favorites.length === 0 && (
                      <div className="py-20 text-center opacity-30">
                        <Heart className="w-12 h-12 mx-auto mb-4" />
                        <p className="font-serif italic text-xl">No favorites saved yet</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6E6E6] py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 opacity-20" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">© 2026 Early Diet Advisor</p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Powered By</p>
              <p className="text-xs font-serif italic">Google Gemini AI</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">Design</p>
              <p className="text-xs font-serif italic">Classic Minimalist</p>
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
              <h3 className="text-lg font-serif italic mb-2">Notice</h3>
              <p className="text-sm opacity-70 mb-6">{validationMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setValidationMessage(null)}
                  className="px-4 py-2 bg-[#1A1A1A] text-white text-xs uppercase tracking-widest font-bold rounded-sm"
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
              <h3 className="text-lg font-serif italic mb-2 text-red-600">Quota Exceeded</h3>
              <p className="text-sm opacity-70 mb-6">
                AI generation quota exceeded. Would you like to use your own Gemini API key to continue? (Requires a paid Google Cloud project)
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setQuotaModalOpen(false)}
                  className="px-4 py-2 border border-[#E6E6E6] text-[#1A1A1A] text-xs uppercase tracking-widest font-bold rounded-sm hover:bg-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setQuotaModalOpen(false);
                    handleOpenKeyDialog();
                  }}
                  className="px-4 py-2 bg-[#1A1A1A] text-white text-xs uppercase tracking-widest font-bold rounded-sm"
                >
                  Use My Key
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
