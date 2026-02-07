import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();

  type ProjectId = Text;
  type TaskId = Text;
  type DocumentId = Text;
  type MediaId = Text;
  type Bereich = Text;
  type ContactId = Text;
  type LinkId = Text;
  type TextValue = Text;
  type MediaType = Text;
  type CostItemId = Text;
  type UserType = { #privat; #business };

  type Project = {
    id : ProjectId;
    name : Text;
    kunde : Text;
    color : Text;
    startDate : ?Time.Time;
    endDate : ?Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?ContactId;
    owner : Principal;
  };

  type Task = {
    id : TaskId;
    titel : Text;
    beschreibung : Text;
    gewerke : Text;
    status : Text;
    dringlichkeit : Nat;
    bereich : Bereich;
    faelligkeit : Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?ContactId;
    projectId : ?ProjectId;
    owner : Principal;
  };

  type Document = {
    id : DocumentId;
    name : Text;
    bereich : Bereich;
    typ : Text;
    status : Text;
    blob : Storage.ExternalBlob;
    owner : Principal;
  };

  type Media = {
    id : MediaId;
    name : Text;
    kategorie : Text;
    typ : Text;
    position : Int;
    tags : [Text];
    blob : Storage.ExternalBlob;
    owner : Principal;
  };

  type MediaPositionUpdate = {
    mediaId : MediaId;
    newPosition : Int;
  };

  type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
    userType : UserType;
  };

  type Contact = {
    id : ContactId;
    name : Text;
    firma : Text;
    rolle : Text;
    email : Text;
    telefon : Text;
    notizen : Text;
    verknuepfteTasks : [TaskId];
    verknuepfteDokumente : [DocumentId];
    owner : Principal;
  };

  type HelpfulLink = {
    id : LinkId;
    titel : Text;
    beschreibung : Text;
    url : Text;
    kategorie : Text;
    logoUrl : Text;
    owner : Principal;
  };

  type CostItem = {
    id : CostItemId;
    beschreibung : Text;
    betrag : Float;
    kategorie : Text;
    status : Text;
    datum : Time.Time;
    projektId : ProjectId;
    handwerker : ?Text;
    dokumentId : ?DocumentId;
    owner : Principal;
  };

  // Persistent Fields
  var projects = Map.empty<Principal, Map.Map<ProjectId, Project>>();
  var tasks = Map.empty<Principal, Map.Map<TaskId, Task>>();
  var documents = Map.empty<Principal, Map.Map<DocumentId, Document>>();
  var media = Map.empty<Principal, Map.Map<MediaId, Media>>();
  var contacts = Map.empty<Principal, Map.Map<ContactId, Contact>>();
  var links = Map.empty<Principal, Map.Map<LinkId, HelpfulLink>>();
  var completedTasks = Map.empty<Principal, Set.Set<TaskId>>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var customCategoriesStore = Map.empty<Principal, Map.Map<TextValue, Map.Map<TextValue, TextValue>>>();
  var costItems = Map.empty<Principal, Map.Map<ProjectId, [CostItem]>>();

  func getUserData<T>(user : Principal, map : Map.Map<Principal, Map.Map<Text, T>>) : Map.Map<Text, T> {
    switch (map.get(user)) {
      case (null) {
        let newMap = Map.empty<Text, T>();
        map.add(user, newMap);
        newMap;
      };
      case (?userMap) { userMap };
    };
  };

  func getUserProjects(user : Principal) : Map.Map<ProjectId, Project> {
    getUserData<Project>(user, projects);
  };

  func getUserTasks(user : Principal) : Map.Map<TaskId, Task> {
    getUserData<Task>(user, tasks);
  };

  func getUserDocumentsInternal(user : Principal) : Map.Map<DocumentId, Document> {
    getUserData<Document>(user, documents);
  };

  func getUserMediaInternal(user : Principal) : Map.Map<MediaId, Media> {
    getUserData<Media>(user, media);
  };

  func getUserContacts(user : Principal) : Map.Map<ContactId, Contact> {
    getUserData<Contact>(user, contacts);
  };

  func getUserLinks(user : Principal) : Map.Map<LinkId, HelpfulLink> {
    getUserData<HelpfulLink>(user, links);
  };

  func getUserCompletedTasks(user : Principal) : Set.Set<TaskId> {
    switch (completedTasks.get(user)) {
      case (null) {
        let newSet = Set.empty<TaskId>();
        completedTasks.add(user, newSet);
        newSet;
      };
      case (?userSet) { userSet };
    };
  };

  func getUserCustomCategories(user : Principal) : Map.Map<TextValue, Map.Map<TextValue, TextValue>> {
    switch (customCategoriesStore.get(user)) {
      case (null) {
        let newMap = Map.empty<TextValue, Map.Map<TextValue, TextValue>>();
        customCategoriesStore.add(user, newMap);
        newMap;
      };
      case (?userMap) { userMap };
    };
  };

  func getUserCostItems(user : Principal) : Map.Map<ProjectId, [CostItem]> {
    switch (costItems.get(user)) {
      case (null) {
        let newMap = Map.empty<ProjectId, [CostItem]>();
        costItems.add(user, newMap);
        newMap;
      };
      case (?userMap) { userMap };
    };
  };

  // Access Control Functions
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Media Uploads Using MixinStorage
  public shared ({ caller }) func uploadMedia(
    id : Text,
    name : Text,
    kategorie : Text,
    typ : Text,
    position : Int,
    tags : [Text],
    blob : Storage.ExternalBlob
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload media");
    };

    let userMedia = getUserMediaInternal(caller);

    let mediaItem : Media = {
      id;
      name;
      kategorie;
      typ;
      position;
      tags;
      blob;
      owner = caller;
    };

    if (userMedia.containsKey(id)) {
      Runtime.trap("Medien-Duplikation: Medienobjekt mit dieser ID existiert bereits");
    };

    userMedia.add(id, mediaItem);
  };

  // Media Position Management
  public shared ({ caller }) func bulkUpdateMediaPositions(updates : [MediaPositionUpdate]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update media positions");
    };

    let userMedia = getUserMediaInternal(caller);

    for (update in updates.values()) {
      switch (userMedia.get(update.mediaId)) {
        case (null) { Runtime.trap("Media with id " # update.mediaId # " not found") };
        case (?mediaItem) {
          // Verify ownership
          if (mediaItem.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
            Runtime.trap("Unauthorized: You can only update positions of your own media");
          };
          let updatedMedia = { mediaItem with position = update.newPosition };
          userMedia.add(update.mediaId, updatedMedia);
        };
      };
    };
  };

  public shared ({ caller }) func deleteUserMedia(mediaId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete media");
    };

    let userMedia = getUserMediaInternal(caller);

    switch (userMedia.get(mediaId)) {
      case (null) {
        Runtime.trap("Media with id " # mediaId # " not found");
      };
      case (?mediaItem) {
        // Verify ownership
        if (mediaItem.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only delete your own media");
        };
        userMedia.remove(mediaId);
      };
    };
  };

  // Document Uploads Using MixinStorage
  public shared ({ caller }) func uploadDocumentWithPDF(
    id : Text,
    name : Text,
    bereich : Bereich,
    typ : Text,
    status : Text,
    blob : Storage.ExternalBlob
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload documents");
    };

    let userDocuments = getUserDocumentsInternal(caller);

    let document : Document = {
      id;
      name;
      bereich;
      typ;
      status;
      blob;
      owner = caller;
    };

    if (userDocuments.containsKey(id)) {
      Runtime.trap("Dokumenten-Duplikation: Dokument mit dieser ID existiert bereits");
    };

    userDocuments.add(id, document);
  };

  // Extended Project Management with Cost Items
  public shared ({ caller }) func createProjekt(
    id : ProjectId,
    name : Text,
    kunde : ?Text,
    color : Text,
    start : ?Time.Time,
    end : ?Time.Time,
    kategorie : Text,
    verantwortlicherKontakt : ?ContactId,
    costItemsArray : [CostItem]
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create projects");
    };

    let userProjects = getUserProjects(caller);

    let userProfile = switch (userProfiles.get(caller)) {
      case (?profile) { ?profile };
      case (null) { null };
    };

    let validatedKunde = switch (userProfile, kunde) {
      case (?profile, _) {
        if (profile.userType == #privat) {
          profile.name;
        } else {
          switch (kunde) {
            case (?k) { k };
            case (_) { "Unbekannter Kunde" };
          };
        };
      };
      case (_) {
        switch (kunde) {
          case (?k) { k };
          case (_) { "Unbekannter Kunde" };
        };
      };
    };

    let projekt : Project = {
      id;
      name;
      kunde = validatedKunde;
      color;
      startDate = start;
      endDate = end;
      kategorie;
      verantwortlicherKontakt;
      owner = caller;
    };

    if (userProjects.containsKey(id)) {
      Runtime.trap("Projekt mit dieser ID existiert bereits");
    };

    userProjects.add(id, projekt);

    let userCostItems = getUserCostItems(caller);
    let validatedCostItems = costItemsArray.map(func(item : CostItem) : CostItem {
      { item with owner = caller; projektId = id };
    });
    userCostItems.add(id, validatedCostItems);
  };

  public query ({ caller }) func getProjekt(id : ProjectId) : async Project {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view projects");
    };

    let userProjects = getUserProjects(caller);

    switch (userProjects.get(id)) {
      case (null) {
        Runtime.trap("Kein Projekt mit dieser ID gefunden");
      };
      case (?projekt) {
        // Verify ownership
        if (projekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only view your own projects");
        };
        projekt;
      };
    };
  };

  public query ({ caller }) func getAllProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view projects");
    };
    // Users can only see their own projects
    getUserProjects(caller).values().toArray();
  };

  public shared ({ caller }) func updateProjekt(
    id : ProjectId,
    name : Text,
    kunde : ?Text,
    color : Text,
    start : ?Time.Time,
    end : ?Time.Time,
    kategorie : Text,
    verantwortlicherKontakt : ?ContactId,
    costItemsArray : [CostItem]
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update projects");
    };

    let userProjects = getUserProjects(caller);

    switch (userProjects.get(id)) {
      case (null) {
        Runtime.trap("Kein Projekt mit dieser ID gefunden");
      };
      case (?existingProjekt) {
        // Verify ownership
        if (existingProjekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only update your own projects");
        };

        let userProfile = switch (userProfiles.get(caller)) {
          case (?profile) { ?profile };
          case (null) { null };
        };

        let validatedKunde = switch (userProfile, kunde) {
          case (?profile, _) {
            if (profile.userType == #privat) {
              profile.name;
            } else {
              switch (kunde) {
                case (?k) { k };
                case (_) { "Unbekannter Kunde" };
              };
            };
          };
          case (_) {
            switch (kunde) {
              case (?k) { k };
              case (_) { "Unbekannter Kunde" };
            };
          };
        };

        let updatedProjekt : Project = {
          id;
          name;
          kunde = validatedKunde;
          color;
          startDate = start;
          endDate = end;
          kategorie;
          verantwortlicherKontakt;
          owner = existingProjekt.owner; // Preserve original owner
        };
        userProjects.add(id, updatedProjekt);

        let userCostItems = getUserCostItems(caller);
        let validatedCostItems = costItemsArray.map(func(item : CostItem) : CostItem {
          { item with owner = existingProjekt.owner; projektId = id };
        });
        userCostItems.add(id, validatedCostItems);
      };
    };
  };

  public shared ({ caller }) func deleteProjekt(id : ProjectId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete projects");
    };

    let userProjects = getUserProjects(caller);

    switch (userProjects.get(id)) {
      case (null) {
        Runtime.trap("Kein Projekt mit dieser ID gefunden");
      };
      case (?projekt) {
        // Verify ownership
        if (projekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only delete your own projects");
        };

        userProjects.remove(id);

        let userCostItems = getUserCostItems(caller);
        userCostItems.remove(id);
      };
    };
  };

  // Cost Item Management
  public shared ({ caller }) func addKostenpunkt(projectId : ProjectId, kost : CostItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add cost items");
    };

    let userProjects = getUserProjects(caller);
    switch (userProjects.get(projectId)) {
      case (null) {
        Runtime.trap("Projekt nicht gefunden");
      };
      case (?projekt) {
        // Verify ownership
        if (projekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only add cost items to your own projects");
        };

        let userCostItems = getUserCostItems(caller);
        let kostWithOwner = { kost with owner = caller; projektId = projectId };
        let currentList = switch (userCostItems.get(projectId)) {
          case (null) { [kostWithOwner] };
          case (?existing) { existing.concat([kostWithOwner]) };
        };
        userCostItems.add(projectId, currentList);
      };
    };
  };

  public shared ({ caller }) func updateKostenpunkt(projectId : ProjectId, kostId : CostItemId, updatedKost : CostItem) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update cost items");
    };

    let userProjects = getUserProjects(caller);
    switch (userProjects.get(projectId)) {
      case (null) {
        Runtime.trap("Projekt nicht gefunden");
      };
      case (?projekt) {
        // Verify ownership
        if (projekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only update cost items in your own projects");
        };

        let userCostItems = getUserCostItems(caller);
        switch (userCostItems.get(projectId)) {
          case (null) { Runtime.trap("Keine Kostenpunkte für dieses Projekt gefunden") };
          case (?koste) {
            let kostFound = koste.find(func(k) { k.id == kostId });
            switch (kostFound) {
              case (null) { Runtime.trap("Kostenpunkt nicht gefunden") };
              case (?existingKost) {
                // Verify ownership of the cost item
                if (existingKost.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
                  Runtime.trap("Unauthorized: You can only update your own cost items");
                };

                let newList = koste.map(
                  func(k) {
                    if (k.id == kostId) {
                      { updatedKost with owner = existingKost.owner; projektId = projectId };
                    } else { k };
                  }
                );
                userCostItems.add(projectId, newList);
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteKostenpunkt(projectId : ProjectId, kostenpunktId : CostItemId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete cost items");
    };

    let userProjects = getUserProjects(caller);
    switch (userProjects.get(projectId)) {
      case (null) {
        Runtime.trap("Projekt nicht gefunden");
      };
      case (?projekt) {
        // Verify ownership
        if (projekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only delete cost items from your own projects");
        };

        let userCostItems = getUserCostItems(caller);
        switch (userCostItems.get(projectId)) {
          case (null) { Runtime.trap("Keine Kostenpunkte für dieses Projekt gefunden") };
          case (?koste) {
            let foundItem = koste.find(func(item) { item.id == kostenpunktId });
            switch (foundItem) {
              case (null) {
                Runtime.trap("Kostenpunkt nicht gefunden");
              };
              case (?item) {
                // Verify ownership of the cost item
                if (item.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
                  Runtime.trap("Unauthorized: You can only delete your own cost items");
                };

                let filteredCosts = koste.filter(func(item) { item.id != kostenpunktId });
                if (filteredCosts.size() == 0) {
                  userCostItems.remove(projectId);
                } else {
                  userCostItems.add(projectId, filteredCosts);
                };
              };
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getKostenpunkteByProjekt(projectId : ProjectId) : async [CostItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view cost items");
    };

    let userProjects = getUserProjects(caller);
    switch (userProjects.get(projectId)) {
      case (null) {
        Runtime.trap("Projekt nicht gefunden oder keine Berechtigung");
      };
      case (?projekt) {
        // Verify ownership
        if (projekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only view cost items from your own projects");
        };

        let userCostItems = getUserCostItems(caller);
        switch (userCostItems.get(projectId)) {
          case (null) { [] };
          case (?koste) { koste };
        };
      };
    };
  };

  public query ({ caller }) func getAllKostenpunkte() : async [CostItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view cost items");
    };

    // Users can only see their own cost items
    let userCostItems = getUserCostItems(caller);
    let allCostArrays = userCostItems.values().toArray();

    // Flatten array of arrays using .flatten method
    let result = allCostArrays.flatten();

    result;
  };

  // Cost Aggregation for Dashboard
  public type KostenUebersicht = {
    gesamt : Float;
    bezahlt : Float;
    offen : Float;
  };

  public query ({ caller }) func getKostenUebersicht(projektId : ?ProjectId) : async KostenUebersicht {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view costs summary");
    };

    let userCostItems = getUserCostItems(caller);

    switch (projektId) {
      case (?pid) {
        let userProjects = getUserProjects(caller);
        switch (userProjects.get(pid)) {
          case (null) {
            Runtime.trap("Projekt nicht gefunden oder keine Berechtigung");
          };
          case (?projekt) {
            // Verify ownership
            if (projekt.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
              Runtime.trap("Unauthorized: You can only view cost summary for your own projects");
            };

            switch (userCostItems.get(pid)) {
              case (null) {
                { gesamt = 0.0; bezahlt = 0.0; offen = 0.0 };
              };
              case (?koste) {
                let sum = koste.foldLeft(0.0, func(acc, k) { acc + k.betrag });
                let paidSum = koste.foldLeft(
                  0.0,
                  func(acc, k) {
                    if (k.status == "bezahlt") { acc + k.betrag } else { acc };
                  },
                );
                {
                  gesamt = sum;
                  bezahlt = paidSum;
                  offen = sum - paidSum;
                };
              };
            };
          };
        };
      };
      case (null) {
        // Summary for all user's projects
        let allCostArrays = userCostItems.values().toArray();
        let allCosts = allCostArrays.flatten();
        let sum = allCosts.foldLeft(0.0, func(acc, k) { acc + k.betrag });
        let paidSum = allCosts.foldLeft(
          0.0,
          func(acc, k) {
            if (k.status == "bezahlt") { acc + k.betrag } else { acc };
          },
        );
        {
          gesamt = sum;
          bezahlt = paidSum;
          offen = sum - paidSum;
        };
      };
    };
  };

  // Filter Projects by User Profile Type
  public query ({ caller }) func filterProjectsByUserType(userType : UserType) : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can filter projects");
    };

    // Users can only filter their own projects
    switch (userProfiles.get(caller)) {
      case (?profile) {
        if (profile.userType == userType) {
          getUserProjects(caller).values().toArray();
        } else {
          [];
        };
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getUserMedia() : async [Media] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view media");
    };
    // Users can only see their own media
    getUserMediaInternal(caller).values().toArray();
  };

  public query ({ caller }) func getUserDocuments() : async [Document] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view documents");
    };
    // Users can only see their own documents
    getUserDocumentsInternal(caller).values().toArray();
  };
};
