import { LanguageCode } from '../../../core/i18n/available-languages';

export interface SoutenirText {
  intro: { title: string; lead: string };
  help: {
    title: string;
    github: { title: string; description: string; cta: string };
    share: { title: string; description: string; cta: string; copied: string };
    donate: { title: string; description: string; coffee: string; sponsors: string };
  };
}

const FR: SoutenirText = {
  intro: {
    title: 'Soutenir FoxRunner',
    lead: 'FoxRunner est un projet indépendant, développé par Foxugly SRL sur son temps libre. Il n’y a rien à payer : si l’outil vous rend service, voici quelques façons de nous encourager.',
  },
  help: {
    title: 'Comment aider',
    github: {
      title: 'Mettre une étoile sur GitHub',
      description: 'Une étoile rend le projet plus visible et nous motive à continuer.',
      cta: 'Ajouter une étoile',
    },
    share: {
      title: 'Partager le projet',
      description: 'Parlez de FoxRunner autour de vous ou copiez le lien pour le transmettre.',
      cta: 'Copier le lien',
      copied: 'Lien copié',
    },
    donate: {
      title: 'Faire un don',
      description: 'Un petit geste aide à couvrir l’hébergement et le temps passé. (Liens bientôt disponibles.)',
      coffee: 'Offrir un café',
      sponsors: 'GitHub Sponsors',
    },
  },
};

const EN: SoutenirText = {
  intro: {
    title: 'Support FoxRunner',
    lead: 'FoxRunner is an independent project, built by Foxugly SRL in its spare time. There is nothing to pay: if the tool helps you, here are a few ways to encourage us.',
  },
  help: {
    title: 'How to help',
    github: {
      title: 'Star it on GitHub',
      description: 'A star makes the project more visible and motivates us to keep going.',
      cta: 'Add a star',
    },
    share: {
      title: 'Share the project',
      description: 'Tell people about FoxRunner or copy the link to pass it on.',
      cta: 'Copy the link',
      copied: 'Link copied',
    },
    donate: {
      title: 'Make a donation',
      description: 'A small gesture helps cover hosting and the time spent. (Links coming soon.)',
      coffee: 'Buy a coffee',
      sponsors: 'GitHub Sponsors',
    },
  },
};

const NL: SoutenirText = {
  intro: {
    title: 'Steun FoxRunner',
    lead: 'FoxRunner is een onafhankelijk project, gebouwd door Foxugly SRL in de vrije tijd. Er is niets te betalen: als de tool je helpt, zijn hier enkele manieren om ons aan te moedigen.',
  },
  help: {
    title: 'Hoe kun je helpen',
    github: {
      title: 'Geef een ster op GitHub',
      description: 'Een ster maakt het project zichtbaarder en motiveert ons om door te gaan.',
      cta: 'Ster toevoegen',
    },
    share: {
      title: 'Deel het project',
      description: 'Vertel anderen over FoxRunner of kopieer de link om hem door te sturen.',
      cta: 'Link kopiëren',
      copied: 'Link gekopieerd',
    },
    donate: {
      title: 'Een gift doen',
      description: 'Een klein gebaar helpt de hosting en de bestede tijd te dekken. (Links binnenkort beschikbaar.)',
      coffee: 'Een koffie aanbieden',
      sponsors: 'GitHub Sponsors',
    },
  },
};

const IT: SoutenirText = {
  intro: {
    title: 'Sostieni FoxRunner',
    lead: 'FoxRunner è un progetto indipendente, sviluppato da Foxugly SRL nel tempo libero. Non c’è nulla da pagare: se lo strumento ti è utile, ecco alcuni modi per incoraggiarci.',
  },
  help: {
    title: 'Come aiutare',
    github: {
      title: 'Metti una stella su GitHub',
      description: 'Una stella rende il progetto più visibile e ci motiva a continuare.',
      cta: 'Aggiungi una stella',
    },
    share: {
      title: 'Condividi il progetto',
      description: 'Parla di FoxRunner o copia il link per trasmetterlo.',
      cta: 'Copia il link',
      copied: 'Link copiato',
    },
    donate: {
      title: 'Fai una donazione',
      description: 'Un piccolo gesto aiuta a coprire l’hosting e il tempo dedicato. (Link presto disponibili.)',
      coffee: 'Offri un caffè',
      sponsors: 'GitHub Sponsors',
    },
  },
};

const ES: SoutenirText = {
  intro: {
    title: 'Apoyar FoxRunner',
    lead: 'FoxRunner es un proyecto independiente, desarrollado por Foxugly SRL en su tiempo libre. No hay nada que pagar: si la herramienta te resulta útil, aquí tienes algunas formas de animarnos.',
  },
  help: {
    title: 'Cómo ayudar',
    github: {
      title: 'Dale una estrella en GitHub',
      description: 'Una estrella hace el proyecto más visible y nos motiva a seguir.',
      cta: 'Añadir una estrella',
    },
    share: {
      title: 'Comparte el proyecto',
      description: 'Habla de FoxRunner o copia el enlace para transmitirlo.',
      cta: 'Copiar el enlace',
      copied: 'Enlace copiado',
    },
    donate: {
      title: 'Hacer una donación',
      description: 'Un pequeño gesto ayuda a cubrir el alojamiento y el tiempo dedicado. (Enlaces disponibles pronto.)',
      coffee: 'Invitar a un café',
      sponsors: 'GitHub Sponsors',
    },
  },
};

const TEXT: Record<LanguageCode, SoutenirText> = { fr: FR, en: EN, nl: NL, it: IT, es: ES };

export function getSoutenirText(lang: LanguageCode): SoutenirText {
  return TEXT[lang] ?? EN;
}
