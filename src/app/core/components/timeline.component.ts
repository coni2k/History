import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material";
import { Project, AuthService, ProjectService, Element, ElementItem, User } from "@forcrowd/backbone-client-core";
import { flatMap, map } from "rxjs/operators";

import { RemoveItemComponent } from "./remove-item.component";
import { Timeline } from "../entities/timeline";

@Component({
  selector: "timeline",
  templateUrl: "timeline.component.html",
  styleUrls: ["timeline.component.css"]
})
export class TimelineComponent implements OnInit {
  activeItem: ElementItem = new ElementItem();
  activeProject: Project = null;
  activeTimeline: Element = null;
  activeUser: User = null;
  isBusy: boolean;
  isOwner = false;

  constructor(
    private readonly authService: AuthService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly dialog: MatDialog,
    private readonly projectService: ProjectService,
    private readonly router: Router
  ) {}

  cancel() {
    this.activeItem.entityAspect.rejectChanges();
    this.activeItem = new ElementItem();
  }

  create() {
    this.activeItem.Name = this.activeItem.Name.trim();

    if (this.activeItem.Name === "") {
      return;
    }

    if (this.activeItem.Id <= 0) {
      this.activeItem.Element = this.activeTimeline;
      this.projectService.createElementItem(this.activeItem);
    }

    this.save();
  }

  edit(selectedItem: ElementItem) {
    this.activeItem = selectedItem;
  }

  remove(elementItem: ElementItem) {
    const dialogRef = this.dialog.open(RemoveItemComponent);

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      this.projectService.removeElementItem(elementItem);

      this.save();
    });
  }

  ngOnInit(): void {
    const username = this.activatedRoute.snapshot.params["username"];
    const timelineKey = this.activatedRoute.snapshot.params["timeline-key"];

    this.isBusy = true;
    this.authService
      .getUser(username)
      .pipe(
        flatMap(user => {
          if (user === null) {
            const url = window.location.href.replace(window.location.origin, "");
            this.router.navigate(["/app/not-found", { url: url }]);
            return;
          }

          this.activeUser = user;
          this.isOwner = this.authService.currentUser === user;

          this.activeProject = user.ProjectSet.find(e => e.Origin === "http://history.forcrowd.org");

          if (this.activeProject === null) {
            const url = window.location.href.replace(window.location.origin, "");
            this.router.navigate(["/app/not-found", { url: url }]);
            return;
          }

          return this.projectService.getProjectExpanded(this.activeProject.Id).pipe(
            map(() => {
              const timeline = (this.activeProject.ElementSet as Timeline[]).find(e => e.UrlKey === timelineKey);

              if (timeline === null) {
                const url = window.location.href.replace(window.location.origin, "");
                this.router.navigate(["/app/not-found", { url: url }]);
                return;
              }

              this.activeTimeline = timeline;
            })
          );
        })
      )
      .subscribe(null, null, () => {
        this.isBusy = false;
      });
  }

  private save() {
    this.isBusy = true;
    this.projectService.saveChanges().subscribe(
      () => {
        this.activeItem = new ElementItem();
      },
      null,
      () => {
        this.isBusy = false;
      }
    );
  }
}
