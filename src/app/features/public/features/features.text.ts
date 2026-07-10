import { LanguageCode } from '../../../core/i18n/available-languages';

export type FeatureKey =
  | 'scenarios'
  | 'live'
  | 'notifications'
  | 'catalog'
  | 'admin'
  | 'i18n';

export interface FeaturesText {
  title: string;
  subtitle: string;
  cta: string;
  cards: Record<FeatureKey, { title: string; description: string }>;
}

const FR: FeaturesText = {
  title: 'Fonctionnalités',
  subtitle:
    "FoxRunner est un moteur d'automatisation de scénarios Selenium planifiés : décrivez vos parcours, programmez-les, suivez leur exécution en direct.",
  cta: 'Commencer',
  cards: {
    scenarios: {
      title: 'Scénarios planifiés',
      description:
        "Décrivez vos parcours Selenium étape par étape et programmez leur exécution par créneaux, sans intervention manuelle.",
    },
    live: {
      title: 'Exécution en direct',
      description:
        "Suivez chaque job en temps réel : progression des étapes, journaux, artefacts et statut final, dès le lancement.",
    },
    notifications: {
      title: 'Notifications PushIT',
      description:
        "Recevez une notification à la fin de chaque exécution, avec une cible PushIT configurable par utilisateur.",
    },
    catalog: {
      title: 'Catalogue partagé',
      description:
        "Réutilisez des collections d'étapes et des scénarios partagés pour composer de nouveaux parcours plus vite.",
    },
    admin: {
      title: 'Administration & audit',
      description:
        "Gérez les comptes, les réglages et la rétention, et gardez une trace auditée des actions sensibles.",
    },
    i18n: {
      title: 'Multilingue',
      description:
        "Interface disponible en français, néerlandais, anglais, italien et espagnol, avec préférence mémorisée.",
    },
  },
};

const EN: FeaturesText = {
  title: 'Features',
  subtitle:
    'FoxRunner is an automation engine for scheduled Selenium scenarios: describe your flows, schedule them, and watch them run live.',
  cta: 'Get started',
  cards: {
    scenarios: {
      title: 'Scheduled scenarios',
      description:
        'Describe your Selenium flows step by step and schedule them by time slots, with no manual intervention.',
    },
    live: {
      title: 'Live execution',
      description:
        'Follow every job in real time: step progress, logs, artifacts and final status, right from launch.',
    },
    notifications: {
      title: 'PushIT notifications',
      description:
        'Get a notification at the end of every run, with a PushIT target configurable per user.',
    },
    catalog: {
      title: 'Shared catalog',
      description:
        'Reuse shared step collections and scenarios to compose new flows faster.',
    },
    admin: {
      title: 'Administration & audit',
      description:
        'Manage accounts, settings and retention, and keep an audited trail of sensitive actions.',
    },
    i18n: {
      title: 'Multilingual',
      description:
        'Interface available in French, Dutch, English, Italian and Spanish, with a remembered preference.',
    },
  },
};

const NL: FeaturesText = {
  title: 'Functies',
  subtitle:
    "FoxRunner is een automatiseringsengine voor geplande Selenium-scenario's: beschrijf je flows, plan ze in en volg de uitvoering live.",
  cta: 'Aan de slag',
  cards: {
    scenarios: {
      title: 'Geplande scenario’s',
      description:
        'Beschrijf je Selenium-flows stap voor stap en plan ze in tijdslots, zonder handmatig ingrijpen.',
    },
    live: {
      title: 'Live uitvoering',
      description:
        'Volg elke job in realtime: voortgang van de stappen, logs, artefacten en eindstatus, vanaf de start.',
    },
    notifications: {
      title: 'PushIT-meldingen',
      description:
        'Ontvang een melding aan het einde van elke uitvoering, met een per gebruiker instelbare PushIT-bestemming.',
    },
    catalog: {
      title: 'Gedeelde catalogus',
      description:
        "Hergebruik gedeelde stapcollecties en scenario's om sneller nieuwe flows samen te stellen.",
    },
    admin: {
      title: 'Beheer & audit',
      description:
        'Beheer accounts, instellingen en bewaring, en houd een geauditeerd spoor van gevoelige acties bij.',
    },
    i18n: {
      title: 'Meertalig',
      description:
        'Interface beschikbaar in het Frans, Nederlands, Engels, Italiaans en Spaans, met onthouden voorkeur.',
    },
  },
};

const IT: FeaturesText = {
  title: 'Funzionalità',
  subtitle:
    "FoxRunner è un motore di automazione per scenari Selenium pianificati: descrivi i tuoi percorsi, pianificali e seguine l'esecuzione in diretta.",
  cta: 'Inizia',
  cards: {
    scenarios: {
      title: 'Scenari pianificati',
      description:
        "Descrivi i tuoi percorsi Selenium passo dopo passo e pianificane l'esecuzione a slot, senza intervento manuale.",
    },
    live: {
      title: 'Esecuzione in diretta',
      description:
        "Segui ogni job in tempo reale: avanzamento dei passi, log, artefatti e stato finale, fin dall'avvio.",
    },
    notifications: {
      title: 'Notifiche PushIT',
      description:
        'Ricevi una notifica al termine di ogni esecuzione, con una destinazione PushIT configurabile per utente.',
    },
    catalog: {
      title: 'Catalogo condiviso',
      description:
        'Riutilizza collezioni di passi e scenari condivisi per comporre più rapidamente nuovi percorsi.',
    },
    admin: {
      title: 'Amministrazione e audit',
      description:
        'Gestisci account, impostazioni e conservazione, e mantieni una traccia auditata delle azioni sensibili.',
    },
    i18n: {
      title: 'Multilingue',
      description:
        'Interfaccia disponibile in francese, olandese, inglese, italiano e spagnolo, con preferenza memorizzata.',
    },
  },
};

const ES: FeaturesText = {
  title: 'Funcionalidades',
  subtitle:
    'FoxRunner es un motor de automatización de escenarios Selenium programados: describe tus recorridos, prográmalos y sigue su ejecución en directo.',
  cta: 'Empezar',
  cards: {
    scenarios: {
      title: 'Escenarios programados',
      description:
        'Describe tus recorridos Selenium paso a paso y programa su ejecución por franjas, sin intervención manual.',
    },
    live: {
      title: 'Ejecución en directo',
      description:
        'Sigue cada job en tiempo real: progreso de los pasos, registros, artefactos y estado final, desde el lanzamiento.',
    },
    notifications: {
      title: 'Notificaciones PushIT',
      description:
        'Recibe una notificación al final de cada ejecución, con un destino PushIT configurable por usuario.',
    },
    catalog: {
      title: 'Catálogo compartido',
      description:
        'Reutiliza colecciones de pasos y escenarios compartidos para componer nuevos recorridos más rápido.',
    },
    admin: {
      title: 'Administración y auditoría',
      description:
        'Gestiona cuentas, ajustes y retención, y mantén un registro auditado de las acciones sensibles.',
    },
    i18n: {
      title: 'Multilingüe',
      description:
        'Interfaz disponible en francés, neerlandés, inglés, italiano y español, con preferencia memorizada.',
    },
  },
};

const TEXT: Record<LanguageCode, FeaturesText> = { fr: FR, en: EN, nl: NL, it: IT, es: ES };

export function getFeaturesText(lang: LanguageCode): FeaturesText {
  return TEXT[lang] ?? EN;
}
