
import { supabase } from "./db.ts";

// Bug logging
export async function logBug(projectId, message, toolName = null) {
  console.log(`🐛 Logging bug for project ${projectId}`);
  try {
    // Extraire les informations du bug
    let title = "Error Detected";
    let description = message;
    let cause = null;
    let fix = null;
    let tool = toolName;

    // Détection du type d'outil depuis le message
    if (!tool) {
      const toolPatterns = {
        'FlutterFlow': /flutterflow|flutter\s*flow/i,
        'Lovable': /lovable/i,
        'Supabase': /supabase|database/i,
        'Make': /make\.com|integromat/i,
        'React': /react|jsx|tsx/i,
        'API': /api|fetch|axios|http|request/i,
        'Firebase': /firebase|firestore/i,
      };

      for (const [toolName, pattern] of Object.entries(toolPatterns)) {
        if (pattern.test(message)) {
          tool = toolName;
          break;
        }
      }
    }

    // Détection du titre du bug
    if (message.includes("failed to fetch")) {
      title = "Network Request Failed";
      cause = "Network connectivity issue or API endpoint problem";
    } else if (message.includes("TypeError")) {
      title = "Type Error";
      cause = "Incorrect data type or undefined value used";
    } else if (message.includes("Error 500") || message.includes("500")) {
      title = "Server Error (500)";
      cause = "Internal server error";
    } else if (message.includes("400") || message.includes("Bad Request")) {
      title = "Bad Request (400)";
      cause = "Invalid request parameters or format";
    } else if (message.includes("401") || message.includes("Unauthorized")) {
      title = "Authentication Error (401)";
      cause = "Missing or invalid authentication credentials";
    } else if (message.includes("404") || message.includes("Not Found")) {
      title = "Not Found (404)";
      cause = "Requested resource does not exist";
    }

    // Enregistrement dans la base de données
    const { data, error } = await supabase
      .from('bugs')
      .insert([{
        project_id: projectId,
        title: title,
        description: description,
        cause: cause,
        fix: fix,
        tool: tool,
        severity: "medium" // Valeur par défaut
      }])
      .select('*')
      .single();

    if (error) {
      console.error("❌ Error saving bug:", error);
      return null;
    }

    console.log(`✅ Bug logged successfully: ${title}`);
    return data;
  } catch (error) {
    console.error("❌ Error in logBug:", error);
    return null;
  }
}

// Test failure logging
export async function logTestFailure(projectId, message) {
  console.log(`🧪 Logging test failure for project ${projectId}`);
  try {
    // Analyse simple du message pour déterminer l'étape et la raison
    let description = message;
    let reason = "Unknown";

    // Détection de patterns communs dans les messages d'échec de test
    if (message.includes("expected") && message.includes("but got")) {
      reason = "Unexpected result";
    } else if (message.includes("timeout")) {
      reason = "Operation timed out";
    } else if (message.includes("syntax") || message.includes("invalid")) {
      reason = "Syntax or validation error";
    }

    const { data, error } = await supabase
      .from('test_failures')
      .insert([{
        project_id: projectId,
        description: description,
        why_it_failed: reason
      }])
      .select('*')
      .single();

    if (error) {
      console.error("❌ Error saving test failure:", error);
      return null;
    }

    console.log(`✅ Test failure logged successfully`);
    return data;
  } catch (error) {
    console.error("❌ Error in logTestFailure:", error);
    return null;
  }
}

// Web resource processing
export async function processWebResources(projectId, message) {
  console.log(`🌐 Processing web resources for project ${projectId}`);
  try {
    // Regex pour identifier les URLs dans le texte
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (!urls || urls.length === 0) {
      return null;
    }

    // Traiter les 3 premières URLs maximum pour éviter surcharge
    const processedUrls = [];
    for (let i = 0; i < Math.min(urls.length, 3); i++) {
      const url = urls[i];
      try {
        console.log(`🔍 Fetching content from URL: ${url}`);
        
        // Tenter de récupérer le contenu de la page
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AssistantBot/1.0)'
          }
        });
        
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch URL ${url}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        
        // Extraction basique du titre
        let title = "";
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }
        
        // Extraction basique de la meta description
        let description = "";
        const descMatch = html.match(/<meta\s+name="description"\s+content="(.*?)".*?>/i);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }
        
        // Sauvegarder dans la base de données
        const { data, error } = await supabase
          .from('web_resources')
          .insert([{
            project_id: projectId,
            url: url,
            title: title,
            extracted_text: description || "No description available"
          }])
          .select('*')
          .single();
        
        if (error) {
          console.error(`❌ Error saving web resource for ${url}:`, error);
          continue;
        }
        
        processedUrls.push(data);
        console.log(`✅ Saved web resource: ${title || url}`);
        
      } catch (urlError) {
        console.error(`❌ Error processing URL ${url}:`, urlError);
        continue;
      }
    }
    
    return processedUrls;
  } catch (error) {
    console.error("❌ Error in processWebResources:", error);
    return null;
  }
}

// Insights detection
export async function detectAndSaveInsights(projectId, content) {
  console.log(`💡 Detecting insights for project ${projectId}`);
  try {
    // Mots-clés qui indiquent souvent des bonnes pratiques
    const insightKeywords = [
      'best practice', 'bonne pratique', 'tip:', 'astuce:',
      'remember to', 'n\'oubliez pas de', 'important:', 
      'recommendation', 'recommandation', 'conseil',
      'vous devriez', 'you should', 'never', 'always', 'toujours', 'jamais'
    ];
    
    // Vérifier si le contenu contient des mots-clés d'insights
    let containsInsightKeyword = false;
    let insightType = "General";
    
    for (const keyword of insightKeywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        containsInsightKeyword = true;
        
        // Déterminer le type d'insight
        if (content.toLowerCase().includes('security') || content.toLowerCase().includes('sécurité')) {
          insightType = "Security";
        } else if (content.toLowerCase().includes('performance')) {
          insightType = "Performance";
        } else if (content.toLowerCase().includes('ui') || content.toLowerCase().includes('ux') || 
                  content.toLowerCase().includes('interface') || content.toLowerCase().includes('design')) {
          insightType = "UI/UX";
        } else if (content.toLowerCase().includes('code') || content.toLowerCase().includes('développement') ||
                  content.toLowerCase().includes('programming')) {
          insightType = "Development";
        }
        
        break;
      }
    }
    
    if (!containsInsightKeyword) {
      return null;
    }
    
    // Extraire le paragraphe qui contient l'insight
    let insightContent = content;
    if (content.length > 300) {
      // Trouver un paragraphe de taille raisonnable qui contient un mot-clé
      const paragraphs = content.split(/\n\n+/);
      for (const paragraph of paragraphs) {
        for (const keyword of insightKeywords) {
          if (paragraph.toLowerCase().includes(keyword.toLowerCase()) && paragraph.length < 500) {
            insightContent = paragraph;
            break;
          }
        }
      }
    }
    
    // Sauvegarder l'insight
    const { data, error } = await supabase
      .from('insights')
      .insert([{
        project_id: projectId,
        type: insightType,
        summary: insightContent.substring(0, 1000) // Limiter la taille
      }])
      .select('*')
      .single();
    
    if (error) {
      console.error("❌ Error saving insight:", error);
      return null;
    }
    
    console.log(`✅ Insight saved: ${insightType}`);
    return data;
  } catch (error) {
    console.error("❌ Error in detectAndSaveInsights:", error);
    return null;
  }
}

// Content analyzer
export async function analyzeContent(projectId, content, role) {
  // N'analyser que les messages utilisateur, pas les réponses de l'assistant
  if (role !== 'user') return;
  
  // Détection de patterns pour les différentes catégories
  const lowerContent = content.toLowerCase();
  
  // 1. Détection de bugs
  const bugPatterns = [
    'error', 'erreur', 'failed', 'échoué', 'bug', 'crash', 'exception',
    '404', '500', '403', 'unauthoriz', 'timeout', 'délai dépassé'
  ];
  
  // 2. Détection de tests échoués
  const testFailurePatterns = [
    'test failed', 'test échoué', 'doesn\'t work', 'ne fonctionne pas',
    'j\'ai essayé', 'i tried', 'attempt failed', 'tentative échouée'
  ];
  
  // Appliquer les détections
  let hasBugPattern = false;
  let hasTestFailurePattern = false;
  
  for (const pattern of bugPatterns) {
    if (lowerContent.includes(pattern)) {
      hasBugPattern = true;
      break;
    }
  }
  
  for (const pattern of testFailurePatterns) {
    if (lowerContent.includes(pattern)) {
      hasTestFailurePattern = true;
      break;
    }
  }
  
  // Traiter selon les patterns détectés
  const tasks = [];
  
  if (hasBugPattern) {
    tasks.push(logBug(projectId, content));
  }
  
  if (hasTestFailurePattern) {
    tasks.push(logTestFailure(projectId, content));
  }
  
  // Toujours chercher des URLs et des insights
  tasks.push(processWebResources(projectId, content));
  tasks.push(detectAndSaveInsights(projectId, content));
  
  // Exécuter tout en parallèle
  await Promise.all(tasks);
}
