# tjBotFragmentThatUsesAzureVisualServices
modifications to IBM's tjbot nodejs implementation that uses Microsoft Azure visual recognition services instead of Watson's services 

These files contain example code that replaces call to tj.see() in your tjbot node.js implementation. 
   As of late 2021, tj.see() no longer works

   The code is intended to illustrate what the tjbot intent 'see' case looks like when using Microsoft Azure's cognitive services instead of IBM's Watson servcies
 
   Note that tj.see() takes a photo.  The replacement code takes the photo itself, and then passes the image to the code that invokes 
     Microsoft's vision services.  I did it that way because I didn't want the functions that invoke Azure to also use tjbot functions.
     
   This code also shows how to do Optical Character Recogntion (OCR) to read text.  

   You can watch my tjbot in action at https://www.youtube.com/playlist?list=PLiBNd_P7062QLBBUJ50LIzQHuxD1KVs0U  

