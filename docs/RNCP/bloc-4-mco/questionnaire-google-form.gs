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
    .setTitle('Movie Picker : ton avis en 2 minutes')
    .setDescription(
      "Tu as utilisé Movie Picker pour choisir un film à plusieurs. J'aimerais l'améliorer et j'ai besoin de ton avis.\n" +
        'Six questions, deux minutes, réponses anonymes. Les retours négatifs sont les plus utiles : n\'hésite pas.'
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
    .setTitle('As-tu voté sur les films proposés ?')
    .setChoiceValues([
      'Oui, sur tous les films de la soirée',
      'Oui, sur quelques-uns seulement',
      "Non, je n'ai pas voté",
      "Je ne savais pas qu'on pouvait voter",
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("Si tu n'as pas voté sur tous les films, qu'est-ce qui t'en a empêché ?")
    .setChoiceValues([
      "Je n'avais pas vu qu'il fallait voter",
      'Je ne savais pas sur quoi je votais',
      "Ça m'a semblé trop long",
      'Les films avaient déjà été ajoutés après mon passage',
      'Le résultat me convenait de toute façon',
    ])
    .showOtherOption(true)
    .setRequired(false);

  form
    .addMultipleChoiceItem()
    .setTitle('As-tu activé les notifications de Movie Picker ?')
    .setChoiceValues([
      'Oui, elles sont activées',
      "Non, j'ai refusé",
      "Je ne me souviens pas qu'on me l'ait proposé",
      'Je ne savais pas que ça existait',
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("Si tu ne les as pas activées, pourquoi ?")
    .setChoiceValues([
      'Je refuse les notifications par principe',
      "On me l'a demandé trop tôt, avant que je comprenne l'application",
      "Je ne voyais pas ce que j'allais recevoir",
      "J'en reçois déjà trop ailleurs",
    ])
    .showOtherOption(true)
    .setRequired(false);

  form
    .addCheckboxItem()
    .setTitle("Qu'est-ce qui te ferait utiliser Movie Picker plus souvent ?")
    .setChoiceValues([
      'Refaire une soirée avec le même groupe en un clic',
      "Des rappels au bon moment (échéance proche, tout le monde a voté)",
      'Un catalogue plus large ou de meilleures suggestions',
      'Une vraie application mobile',
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
