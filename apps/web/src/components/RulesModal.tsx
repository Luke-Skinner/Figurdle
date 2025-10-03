"use client";
import { useEffect } from "react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto
                      transform transition-all duration-300 scale-100 opacity-100">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">How to Play Figurdle</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100
                       transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Rules Content */}
          <div className="space-y-4 text-gray-700">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Objective</h3>
              <p>
                Guess the famous figure of the day! This could be anyone from history, science,
                entertainment, sports, politics, literature, art, technology, or any other field.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">How it Works</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>Each day features a new famous figure to guess</li>
                <li>Submit your guesses to reveal progressive hints</li>
                <li>Hints start vague and become more specific</li>
                <li>You can play until you guess correctly or run out of hints</li>
                <li>Each person gets one puzzle per day</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Tips</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>Consider both first names and last names</li>
                <li>Try different variations and nicknames</li>
                <li>The figure could be from any time period or field</li>
                <li>If stuck try with friends (You do not have any-👥)</li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">Daily Challenge</h4>
              <p className="text-amber-800 text-sm">
                Each puzzle is designed to be challenging but fair. Come back every day
                for a new figure to discover.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-amber-600 text-white font-medium rounded-xl
                       hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500
                       transition-colors duration-200"
            >
              Enough yapping!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}