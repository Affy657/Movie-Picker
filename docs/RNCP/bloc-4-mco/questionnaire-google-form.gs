/**
 * Génère le questionnaire de retour utilisateur Movie Picker.
 *
 * Utilisation :
 *   1. Ouvrir https://script.google.com/ puis « Nouveau projet »
 *   2. Coller ce fichier, remplacer le contenu par défaut
 *   3. Lancer la fonction genererQuestionnaire, autoriser l'accès quand Google le demande
 *   4. Le lien de partage s'affiche dans le journal d'exécution (Ctrl+Entrée)
 *
 * Le script vide le formulaire cible avant de le reconstruire : il est rejouable
 * sans créer de doublons.
 */

const FORM_ID = '1u_FlEJPyoUATSZp18kE-Ak3hb6upPQv4mu8Znksd8_o';

function genererQuestionnaire() {
  const form = FormApp.openById(FORM_ID);

  form
    .setTitle('Movie Picker : ton avis en 3 minutes')
    .setDescription(
      "Tu as utilisé Movie Picker pour choisir un film à plusieurs. J'aimerais l'améliorer et j'ai besoin de ton avis.\n" +
        "Neuf questions, trois minutes, réponses anonymes. Les retours négatifs sont les plus utiles : n'hésite pas."
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setConfirmationMessage("Merci, c'est noté. Les retours sont lus un par un.");

  form.getItems().forEach((item) => form.deleteItem(item));

  form
    .addMultipleChoiceItem()
    .setTitle('À quelle fréquence utilises-tu Movie Picker ?')
    .setChoiceValues([
      'À chaque soirée film',
      'De temps en temps',
      'Une seule fois, pour essayer',
      "Jamais vraiment utilisé après l'inscription",
    ])
    .setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle("Qu'est-ce qui t'a le plus manqué ou agacé lors de ta dernière utilisation ?")
    .setHelpText("Même une petite gêne compte. Si rien ne t'a dérangé, laisse vide.")
    .setRequired(false);

  form
    .addMultipleChoiceItem()
    .setTitle('As-tu utilisé les boutons « Voter pour » et « Voter contre » ?')
    .setHelpText('Sur chaque film proposé, deux boutons permettent de voter pour ou contre.')
    .setChoiceValues([
      'Oui, sur la plupart des films proposés',
      'Oui, sur un ou deux films seulement',
      "Non, je n'ai jamais voté",
      "Je n'avais pas remarqué ces boutons",
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('Selon toi, tes votes influencent-ils le résultat de la roue ?')
    .setHelpText(
      "L'hôte peut choisir entre un tirage totalement aléatoire et un tirage où les films les mieux votés ont plus de chances de sortir."
    )
    .setChoiceValues([
      'Oui, les films les plus votés ont plus de chances de sortir',
      'Non, le tirage est totalement aléatoire quoi qu\'il arrive',
      "Ça dépend d'un réglage choisi par l'hôte",
      'Je ne me suis jamais posé la question',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("Si tu n'as pas voté, ou peu voté, qu'est-ce qui t'en a empêché ?")
    .setChoiceValues([
      "Je n'avais pas remarqué les boutons",
      'Je ne voyais pas à quoi servait mon vote',
      'Je pensais que le tirage était de toute façon aléatoire',
      'Je ne connaissais pas assez les films proposés pour me prononcer',
      'Je préférais laisser choisir les autres',
      'Les films ont été ajoutés après mon passage',
    ])
    .showOtherOption(true)
    .setRequired(false);

  form
    .addMultipleChoiceItem()
    .setTitle('As-tu autorisé les notifications système de Movie Picker ?')
    .setHelpText(
      "Il s'agit des notifications qui s'affichent sur ton téléphone ou ton ordinateur même quand Movie Picker est fermé, à ne pas confondre avec la cloche à l'intérieur de l'application."
    )
    .setChoiceValues([
      'Oui, je les reçois',
      "Non, j'ai refusé quand on me l'a demandé",
      "Je ne me souviens pas qu'on me l'ait proposé",
      'Je ne savais pas que ça existait',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("Si tu ne les as pas autorisées, pourquoi ?")
    .setChoiceValues([
      'Je refuse les notifications système par principe',
      "On me l'a demandé trop tôt, avant que je comprenne l'application",
      "Je ne voyais pas ce que j'allais recevoir",
      "La cloche dans l'application me suffit",
      "J'en reçois déjà trop ailleurs",
    ])
    .showOtherOption(true)
    .setRequired(false);

  form
    .addCheckboxItem()
    .setTitle('Parmi ces fonctionnalités existantes, lesquelles connaissais-tu ?')
    .setHelpText('Coche celles que tu connaissais, même si tu ne les as pas utilisées.')
    .setChoiceValues([
      'La petite note de présentation pour défendre son film en quelques mots',
      "La marque « déjà vu », qui signale un film aux autres sans influencer le tirage",
      'Le réglage du mode de la roue, aléatoire ou pondéré par les votes',
      'L\'ajout de la soirée à son agenda',
      'Les séries en plus des films',
      'Le filtre par durée dans la recherche',
      "Le profil public et le suivi d'autres utilisateurs",
      "L'installation de Movie Picker sur l'écran d'accueil, comme une application",
      'Aucune de ces fonctionnalités',
    ])
    .setRequired(false);

  form
    .addCheckboxItem()
    .setTitle("Qu'est-ce qui te ferait utiliser Movie Picker plus souvent ?")
    .setChoiceValues([
      'Relancer une soirée avec le même groupe en un clic',
      'Un rappel quand la date de fin des propositions approche',
      'Voir clairement l\'effet de mes votes sur le tirage',
      'Des suggestions de films adaptées aux goûts du groupe',
      'Garder la trace des films déjà regardés ensemble',
      "Rien de particulier, je l'utilise quand j'en ai besoin",
    ])
    .showOtherOption(true)
    .setRequired(false);

  form
    .addScaleItem()
    .setTitle('Recommanderais-tu Movie Picker à un ami ?')
    .setBounds(0, 10)
    .setLabels('Pas du tout', 'Sans hésiter')
    .setRequired(true);

  form.addParagraphTextItem().setTitle('Autre chose à dire ?').setRequired(false);

  Logger.log('Formulaire prêt.');
  Logger.log('Lien à envoyer   : ' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log("Lien d'édition   : " + form.getEditUrl());
}
