# Pronote Bot

![ftb](https://forthebadge.com/images/badges/built-by-developers.svg)
![ftb](https://forthebadge.com/images/badges/made-with-javascript.svg)
![ftb](https://forthebadge.com/images/badges/built-with-love.svg)

Chatbot Pronote disponible sur Instagram!

## Connectez-vous, affichez vos moyennes et recevez des notifs!
<img src="./screenshots/login.jpg" style="margin-right: 2px;width: 30%;" height="430"></img>
<img src="./screenshots/moyennes.jpg" style="margin-right: 2px;width: 30%;" height="430"></img>
<img src="./screenshots/notifications.jpg" style="width: 30%;" height="430"></img>

## 💪 Fonctionnalités

### 💬 Commandes
* Page d'aide - `!help`
* Connexion/Déconnexion - `!login`/`!logout`
* Affichage des moyennes en temps réel (moyenne normale et moyenne pluriannuelle) - `!moy`
* Envoie en tant qu'image de la photo de profil pronote - `!picture`
* Activation/Désactivation des notifications - `!notif`/`!dénotif`

### 🔔 Notifications
Notifications lors de l'ajout d'une note, avec les fonctionnalités suivantes:
* calcul des points gagnés/perdus
* détection de la matière
* affichage de la nouvelle moyenne générale
* affichage de la nouvelle moyenne dans la matière qui a changée

## 📅 To-do

* récapitulatif des cours annulés pour le lendemain
* notification lors de la réception d'un message ENT
* autorisation automatique lors d'une demande de message privé sur Instagram

## ⚙️ Comment ça marche ? - Obtention des données depuis Pronote

Pronote ne disposant pas d'API permettant d'intégrer facilement certaines fonctionnalités, le @pronote_bot utilise Puppeteer, une librarie Node.js qui utilise Chromium. Pour chaque requête, le bot va ouvrir un nouveau navigateur, se rendre sur l'adresse ENT spécifiée dans la configuration et se connecter. Une fois cela fait, il va se rendre sur Pronote. La connexion ayant été réalisée sur l'ENT, Pronote va utiliser les cookies déjà présents dans le navigateur et autoriser l'accès. Des requêtes XHR vont alors être envoyées à l'API privée de Pronote, et le bot va récupérer les réponses de ces requêtes. Il va fermer le navigateur puis instancier une nouvelle classe `Student` en lui passant les données reçues par les requêtes XHR.