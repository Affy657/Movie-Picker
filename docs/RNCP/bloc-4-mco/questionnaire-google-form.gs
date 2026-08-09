const FORM_ID = '1u_FlEJPyoUATSZp18kE-Ak3hb6upPQv4mu8Znksd8_o';
const ECRASER_LE_FORMULAIRE_EXISTANT = false;

function genererQuestionnaire() {
  const form = FormApp.openById(FORM_ID);
  const questionsExistantes = form.getItems();

  if (questionsExistantes.length > 0 && !ECRASER_LE_FORMULAIRE_EXISTANT) {
    throw new Error(
      'Le formulaire contient déjà ' +
        questionsExistantes.length +
        ' questions. Passer ECRASER_LE_FORMULAIRE_EXISTANT à true pour les remplacer : ' +
        'toute modification faite à la main dans Google Forms, et les réponses déjà ' +
        'reçues sur les questions supprimées, seront perdues.'
    );
  }

  for (let i = questionsExistantes.length - 1; i >= 0; i--) {
    form.deleteItem(questionsExistantes[i]);
  }

  form
    .setTitle('Movie Picker : ton avis en 4 minutes')
    .setDescription(
      "Tu as utilisé Movie Picker pour choisir un film à plusieurs. J'aimerais l'améliorer et j'ai besoin de ton avis.\n" +
        "Douze questions courtes, quatre minutes, réponses anonymes. Les retours négatifs sont les plus utiles : n'hésite pas."
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setProgressBar(true)
    .setShuffleQuestions(false)
    .setConfirmationMessage("Merci, c'est noté. Les retours sont lus un par un.");

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
    .addMultipleChoiceItem()
    .setTitle('Comment votre groupe choisit-il finalement le film ?')
    .setChoiceValues([
      "La roue tranche, on regarde ce qu'elle donne",
      "On discute d'abord, la roue ne fait que confirmer un choix déjà fait",
      "On relance la roue jusqu'à tomber sur un film qui convient à tout le monde",
      "L'hôte décide, la roue est surtout là pour l'ambiance",
      'Ça dépend des soirées',
    ])
    .showOtherOption(true)
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('Idéalement, que devrait faire ton vote ?')
    .setChoiceValues([
      'Augmenter les chances du film dans le tirage',
      'Écarter du tirage les films rejetés par le groupe',
      'Donner un avis, sans rien changer au tirage',
      'Servir de base à la discussion, le tirage restant à part',
    ])
    .showOtherOption(true)
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('Savais-tu que tu peux activer ces notifications depuis la page « Mon compte » ?')
    .setHelpText(
      "Il s'agit des notifications qui s'affichent sur ton téléphone ou ton ordinateur même quand Movie Picker est fermé, à ne pas confondre avec la cloche à l'intérieur de l'application."
    )
    .setChoiceValues([
      'Oui, et je les ai activées',
      "Oui, mais je ne l'ai pas fait",
      "Non, je ne savais pas que c'était possible",
      "J'ai essayé, mais ça n'a pas fonctionné",
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("Qu'est-ce qui te ferait activer les notifications ?")
    .setChoiceValues([
      'Savoir précisément ce que je vais recevoir, et à quelle fréquence',
      "Qu'on me le propose au moment utile, par exemple quand je rejoins une soirée",
      "Pouvoir n'activer que certaines notifications, comme le rappel de soirée",
      "La cloche dans l'application me suffit, je n'en veux pas d'autres",
      'Rien, je refuse les notifications système par principe',
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
