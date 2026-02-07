import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  type ProjectId = Text;
  type ContactId = Text;

  type OldProject = {
    id : ProjectId;
    name : Text;
    kunde : Text;
    color : Text;
    startDate : Time.Time;
    endDate : Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?ContactId;
    owner : Principal.Principal;
  };

  type NewProject = {
    id : ProjectId;
    name : Text;
    kunde : Text;
    color : Text;
    startDate : ?Time.Time;
    endDate : ?Time.Time;
    kategorie : Text;
    verantwortlicherKontakt : ?ContactId;
    owner : Principal.Principal;
  };

  type OldBackend = {
    projects : Map.Map<Principal.Principal, Map.Map<ProjectId, OldProject>>;
    // Copy all other fields, as well
  };

  type NewBackend = {
    projects : Map.Map<Principal.Principal, Map.Map<ProjectId, NewProject>>;
    // Copy all other fields, as well
  };

  public func run(old : OldBackend) : NewBackend {
    let updatedProjects = old.projects.map<Principal.Principal, Map.Map<ProjectId, OldProject>, Map.Map<ProjectId, NewProject>>(
      func(_principal, projectMap) {
        projectMap.map<ProjectId, OldProject, NewProject>(
          func(_projectId, project) {
            { project with startDate = ?project.startDate; endDate = ?project.endDate };
          }
        );
      }
    );
    { old with projects = updatedProjects };
  };
};
