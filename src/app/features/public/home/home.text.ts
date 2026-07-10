import { LanguageCode } from '../../../core/i18n/available-languages';

export type HighlightKey = 'slots' | 'supervised' | 'notifications' | 'i18n';

export interface HomeText {
  hero: {
    title: string;
    lead: string;
    login: string;
    features: string;
  };
  highlights: {
    title: string;
    cards: Record<HighlightKey, { title: string; description: string }>;
  };
}

const FR: HomeText = {
  hero: {
    title: "Automatisez vos scénarios web, à l'heure dite",
    lead: "FoxRunner planifie et exécute vos scénarios Selenium par créneaux, suit chaque job en direct et vous notifie du résultat. Décrivez le parcours une fois, laissez-le tourner.",
    login: 'Se connecter',
    features: 'Voir les fonctionnalités',
  },
  highlights: {
    title: 'Points forts',
    cards: {
      slots: {
        title: 'Planification par créneaux',
        description: 'Programmez vos scénarios sur des créneaux dédiés, sans intervention manuelle.',
      },
      supervised: {
        title: 'Exécution supervisée',
        description: 'Suivez la progression, les journaux et le statut de chaque job en temps réel.',
      },
      notifications: {
        title: 'Notifications PushIT',
        description: 'Recevez le résultat de chaque exécution sur une cible PushIT configurable.',
      },
      i18n: {
        title: 'Multilingue',
        description: 'Interface en français, néerlandais, anglais, italien et espagnol.',
      },
    },
  },
};

const EN: HomeText = {
  hero: {
    title: 'Automate your web scenarios, right on schedule',
    lead: 'FoxRunner schedules and runs your Selenium scenarios by time slots, follows every job live and notifies you of the result. Describe the flow once, let it run.',
    login: 'Sign in',
    features: 'See the features',
  },
  highlights: {
    title: 'Highlights',
    cards: {
      slots: {
        title: 'Slot-based scheduling',
        description: 'Schedule your scenarios on dedicated time slots, with no manual intervention.',
      },
      supervised: {
        title: 'Supervised execution',
        description: 'Follow the progress, logs and status of every job in real time.',
      },
      notifications: {
        title: 'PushIT notifications',
        description: 'Get the result of each run on a configurable PushIT target.',
      },
      i18n: {
        title: 'Multilingual',
        description: 'Interface in French, Dutch, English, Italian and Spanish.',
      },
    },
  },
};

const NL: HomeText = {
  hero: {
    title: 'Automatiseer je webscenario’s, precies op tijd',
    lead: "FoxRunner plant en voert je Selenium-scenario's uit in tijdslots, volgt elke job live en meldt je het resultaat. Beschrijf de flow één keer en laat hem draaien.",
    login: 'Aanmelden',
    features: 'Bekijk de functies',
  },
  highlights: {
    title: 'Pluspunten',
    cards: {
      slots: {
        title: 'Planning met tijdslots',
        description: "Plan je scenario's in op vaste tijdslots, zonder handmatig ingrijpen.",
      },
      supervised: {
        title: 'Bewaakte uitvoering',
        description: 'Volg de voortgang, logs en status van elke job in realtime.',
      },
      notifications: {
        title: 'PushIT-meldingen',
        description: 'Ontvang het resultaat van elke uitvoering op een instelbare PushIT-bestemming.',
      },
      i18n: {
        title: 'Meertalig',
        description: 'Interface in het Frans, Nederlands, Engels, Italiaans en Spaans.',
      },
    },
  },
};

const IT: HomeText = {
  hero: {
    title: "Automatizza i tuoi scenari web, all'ora stabilita",
    lead: "FoxRunner pianifica ed esegue i tuoi scenari Selenium a slot, segue ogni job in diretta e ti notifica il risultato. Descrivi il percorso una volta e lascialo girare.",
    login: 'Accedi',
    features: 'Vedi le funzionalità',
  },
  highlights: {
    title: 'Punti di forza',
    cards: {
      slots: {
        title: 'Pianificazione a slot',
        description: 'Pianifica i tuoi scenari su slot dedicati, senza intervento manuale.',
      },
      supervised: {
        title: 'Esecuzione supervisionata',
        description: 'Segui avanzamento, log e stato di ogni job in tempo reale.',
      },
      notifications: {
        title: 'Notifiche PushIT',
        description: 'Ricevi il risultato di ogni esecuzione su una destinazione PushIT configurabile.',
      },
      i18n: {
        title: 'Multilingue',
        description: 'Interfaccia in francese, olandese, inglese, italiano e spagnolo.',
      },
    },
  },
};

const ES: HomeText = {
  hero: {
    title: 'Automatiza tus escenarios web, a la hora prevista',
    lead: 'FoxRunner programa y ejecuta tus escenarios Selenium por franjas, sigue cada job en directo y te notifica el resultado. Describe el recorrido una vez y déjalo correr.',
    login: 'Iniciar sesión',
    features: 'Ver las funcionalidades',
  },
  highlights: {
    title: 'Puntos fuertes',
    cards: {
      slots: {
        title: 'Planificación por franjas',
        description: 'Programa tus escenarios en franjas dedicadas, sin intervención manual.',
      },
      supervised: {
        title: 'Ejecución supervisada',
        description: 'Sigue el progreso, los registros y el estado de cada job en tiempo real.',
      },
      notifications: {
        title: 'Notificaciones PushIT',
        description: 'Recibe el resultado de cada ejecución en un destino PushIT configurable.',
      },
      i18n: {
        title: 'Multilingüe',
        description: 'Interfaz en francés, neerlandés, inglés, italiano y español.',
      },
    },
  },
};

const TEXT: Record<LanguageCode, HomeText> = { fr: FR, en: EN, nl: NL, it: IT, es: ES };

export function getHomeText(lang: LanguageCode): HomeText {
  return TEXT[lang] ?? EN;
}
