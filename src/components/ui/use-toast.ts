
// Import toast from sonner but create our own useToast hook for compatibility
import { toast } from "sonner";

// Export toast directly
export { toast };

// Create a simple hook to mimic useToast API
export const useToast = () => {
  return {
    toast,
  };
};
