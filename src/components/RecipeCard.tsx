import React from "react";
import { Clock, Utensils, BookOpen, Heart, Sparkles, Loader2, Download, Activity } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  cookingTime: string;
  category: string;
  nutrition?: {
    calories: string;
    protein: string;
    carbs: string;
    fats: string;
  };
}

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite?: boolean;
  onToggleFavorite?: (recipe: Recipe) => void;
  imageUrl?: string;
  onGenerateImage?: (title: string) => void;
  isGeneratingImage?: boolean;
  onAnalyzeNutrition?: (recipe: Recipe, imageUrl: string) => void;
  isAnalyzingNutrition?: boolean;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  isFavorite = false, 
  onToggleFavorite,
  imageUrl,
  onGenerateImage,
  isGeneratingImage = false,
  onAnalyzeNutrition,
  isAnalyzingNutrition = false
}) => {
  return (
    <motion.div 
      id={`recipe-${recipe.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-3xl overflow-hidden group hover:shadow-lg transition-all relative"
    >
      <div className="absolute top-4 right-16 z-10 flex gap-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            // This will be handled by a prop or a global handler
            (window as any).downloadRecipePDF?.(recipe);
          }}
          className="p-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
          title="Download Recipe PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <div className="aspect-video w-full bg-slate-50 border-b border-slate-200 flex flex-col items-center justify-center p-8 relative overflow-hidden group/img">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 relative z-10 group-hover/img:scale-110 transition-transform duration-500">
          <Utensils className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="text-center relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600/40 mb-1 block">Recipe Reference</span>
          <h4 className="text-sm font-sans font-semibold tracking-tight text-slate-400">{recipe.title}</h4>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/10" />
      </div>

      <div className="p-8 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
                {recipe.category}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                <Clock className="w-3 h-3" />
                {recipe.cookingTime}
              </div>
            </div>
            <h3 className="text-2xl font-sans font-bold tracking-tight text-slate-900 leading-tight">{recipe.title}</h3>
          </div>
          <button 
            onClick={() => onToggleFavorite?.(recipe)}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300",
              isFavorite ? "bg-red-50 text-red-500 shadow-sm" : "bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50/50"
            )}
          >
            <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
          </button>
        </div>

        {/* Nutritional Information Table */}
        {recipe.nutrition && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/30">
            <div className="grid grid-cols-4 divide-x divide-slate-100">
              <div className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Calories</p>
                <p className="text-sm font-sans font-bold text-slate-900">{recipe.nutrition.calories}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Protein</p>
                <p className="text-sm font-sans font-bold text-slate-900">{recipe.nutrition.protein}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Carbs</p>
                <p className="text-sm font-sans font-bold text-slate-900">{recipe.nutrition.carbs}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fats</p>
                <p className="text-sm font-sans font-bold text-slate-900">{recipe.nutrition.fats}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-800">
              <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              Ingredients
              <span className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {recipe.ingredients.length} Items
              </span>
            </h4>
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-3 group/item">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/30 group-hover/item:bg-emerald-500 transition-colors shrink-0" />
                  <span className="leading-tight">{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-800">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
              </div>
              Instructions
            </h4>
            <ol className="space-y-4">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="text-sm text-slate-600 flex gap-4 group/step">
                  <span className="text-xs font-sans font-bold text-slate-300 group-hover/step:text-blue-500 transition-colors shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
