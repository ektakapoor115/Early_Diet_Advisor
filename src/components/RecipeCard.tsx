import React from "react";
import { Clock, Utensils, BookOpen, Heart, Sparkles, Loader2, Download } from "lucide-react";
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
      {imageUrl && (
        <div className="aspect-video w-full overflow-hidden border-b border-slate-200">
          <img 
            src={imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      
      {!imageUrl && onGenerateImage && (
        <div 
          className="aspect-video w-full bg-slate-50 border-b border-slate-200 flex flex-col items-center justify-center p-8 cursor-pointer group/img"
          onClick={() => onGenerateImage(recipe.title)}
        >
          {isGeneratingImage ? (
            <Loader2 className="w-6 h-6 animate-spin opacity-20" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 opacity-10 group-hover/img:opacity-40 transition-opacity mb-3" />
              <span className="text-xs font-medium text-slate-400 group-hover/img:opacity-60 transition-opacity">Generate AI Recipe Image</span>
            </>
          )}
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-semibold tracking-wide uppercase text-slate-500 mb-1 block">
              {recipe.category}
            </span>
            <h3 className="text-xl font-sans font-semibold tracking-tight text-slate-900">{recipe.title}</h3>
          </div>
          <button 
            onClick={() => onToggleFavorite?.(recipe)}
            className={cn(
              "p-2 rounded-full transition-colors",
              isFavorite ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400 hover:text-red-500"
            )}
          >
            <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
          </button>
        </div>

        {/* Nutritional Information */}
        {recipe.nutrition ? (
          <div className="grid grid-cols-4 gap-2 py-3 border-y border-slate-100">
            <div className="text-center">
              <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500 mb-1">Calories</p>
              <p className="text-xs font-sans font-semibold tracking-tight text-slate-900">{recipe.nutrition.calories}</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500 mb-1">Protein</p>
              <p className="text-xs font-sans font-semibold tracking-tight text-slate-900">{recipe.nutrition.protein}</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500 mb-1">Carbs</p>
              <p className="text-xs font-sans font-semibold tracking-tight text-slate-900">{recipe.nutrition.carbs}</p>
            </div>
            <div className="text-center border-l border-slate-100">
              <p className="text-[10px] font-semibold tracking-wide uppercase text-slate-500 mb-1">Fats</p>
              <p className="text-xs font-sans font-semibold tracking-tight text-slate-900">{recipe.nutrition.fats}</p>
            </div>
          </div>
        ) : (
          imageUrl && onAnalyzeNutrition && (
            <button 
              onClick={() => onAnalyzeNutrition(recipe, imageUrl)}
              disabled={isAnalyzingNutrition}
              className="w-full py-2 bg-slate-50 border border-slate-200 rounded-3xl text-[10px] font-semibold tracking-wide uppercase text-slate-500 hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
            >
              {isAnalyzingNutrition ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Analyze Nutrition
            </button>
          )
        )}

        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {recipe.cookingTime}
          </div>
          <div className="flex items-center gap-1.5">
            <Utensils className="w-3 h-3" />
            {recipe.ingredients.length} Ingredients
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="flex items-center gap-2 text-xs font-medium tracking-wide mb-3">
              <BookOpen className="w-3 h-3" /> Ingredients
            </h4>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="w-1 h-1 bg-slate-300 rounded-full mt-1.5 shrink-0" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-medium tracking-wide mb-3">Instructions</h4>
            <ol className="space-y-3">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="text-xs text-slate-600 flex gap-3">
                  <span className="font-sans font-semibold tracking-tight opacity-30 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
