import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";

module {
  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    projects : Map.Map<Principal, Map.Map<Text, Project>>;
    tasks : Map.Map<Principal, Map.Map<Text, Task>>;
    documents : Map.Map<Principal, Map.Map<Text, Document>>;
    media : Map.Map<Principal, Map.Map<Text, Media>>;
    contacts : Map.Map<Principal, Map.Map<Text, Contact>>;
    links : Map.Map<Principal, Map.Map<Text, HelpfulLink>>;
    completedTasks : Map.Map<Principal, Set.Set<Text>>;
    userProfiles : Map.Map<Principal, UserProfile>;
    customCategoriesStore : Map.Map<Principal, Map.Map<Text, Map.Map<Text, Text>>>;
    costItems : Map.Map<Principal, Map.Map<Text, [CostItem]>>;
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    projects : Map.Map<Principal, Map.Map<Text, Project>>;
    tasks : Map.Map<Principal, Map.Map<Text, Task>>;
    documents : Map.Map<Principal, Map.Map<Text, Document>>;
    media : Map.Map<Principal, Map.Map<Text, Media>>;
    contacts : Map.Map<Principal, Map.Map<Text, Contact>>;
    links : Map.Map<Principal, Map.Map<Text, HelpfulLink>>;
    completedTasks : Map.Map<Principal, Set.Set<Text>>;
    userProfiles : Map.Map<Principal, UserProfile>;
    customCategoriesStore : Map.Map<Principal, Map.Map<Text, Map.Map<Text, Text>>>;
    costItems : Map.Map<Principal, Map.Map<Text, [CostItem]>>;
  };

  type Project = {
    id : Text;
    name : Text;
    kunde : Text;
    color : Text;
    startDate : ?Time.Time;
    endDate : ?Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?Text;
    owner : Principal;
  };

  type Task = {
    id : Text;
    titel : Text;
    beschreibung : Text;
    gewerke : Text;
    status : Text;
    dringlichkeit : Nat;
    bereich : Text;
    faelligkeit : Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?Text;
    projectId : ?Text;
    owner : Principal;
  };

  type Document = {
    id : Text;
    name : Text;
    bereich : Text;
    typ : Text;
    status : Text;
    blob : Storage.ExternalBlob;
    owner : Principal;
  };

  type Media = {
    id : Text;
    name : Text;
    kategorie : Text;
    typ : Text;
    position : Int;
    tags : [Text];
    blob : Storage.ExternalBlob;
    owner : Principal;
  };

  type Contact = {
    id : Text;
    name : Text;
    firma : Text;
    rolle : Text;
    email : Text;
    telefon : Text;
    notizen : Text;
    verknuepfteTasks : [Text];
    verknuepfteDokumente : [Text];
    owner : Principal;
  };

  type HelpfulLink = {
    id : Text;
    titel : Text;
    beschreibung : Text;
    url : Text;
    kategorie : Text;
    logoUrl : Text;
    owner : Principal;
  };

  type CostItem = {
    id : Text;
    beschreibung : Text;
    betrag : Float;
    kategorie : Text;
    status : Text;
    datum : Time.Time;
    projektId : Text;
    handwerker : ?Text;
    dokumentId : ?Text;
    owner : Principal;
  };

  type UserProfile = {
    name : Text;
    email : Text;
    role : Text;
    userType : { #privat; #business };
  };

  public func run(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      projects = old.projects;
      tasks = old.tasks;
      documents = old.documents;
      media = old.media;
      contacts = old.contacts;
      links = old.links;
      completedTasks = old.completedTasks;
      userProfiles = old.userProfiles;
      customCategoriesStore = old.customCategoriesStore;
      costItems = old.costItems;
    };
  };
};
