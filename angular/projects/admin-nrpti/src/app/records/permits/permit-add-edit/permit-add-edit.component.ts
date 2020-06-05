import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { Picklists, EpicProjectIds } from '../../../../../../common/src/app/utils/record-constants';
import { Legislation } from '../../../../../../common/src/app/models/master/common-models/legislation';
import { FactoryService } from '../../../services/factory.service';
import { Utils } from 'nrpti-angular-components';
import { Utils as CommonUtils } from '../../../../../../common/src/app/utils/utils';
import { RecordUtils } from '../../utils/record-utils';
import { LoadingScreenService } from 'nrpti-angular-components';

@Component({
  selector: 'app-permit-add-edit',
  templateUrl: './permit-add-edit.component.html',
  styleUrls: ['./permit-add-edit.component.scss']
})
export class PermitAddEditComponent implements OnInit, OnDestroy {
  private ngUnsubscribe: Subject<boolean> = new Subject<boolean>();

  public loading = true;
  public isEditing = false;
  public currentRecord = null;
  public myForm: FormGroup;
  public lastEditedSubText = null;

  // Flavour data
  public lngFlavour = null;
  public lngPublishSubtext = 'Not published';

  // Pick lists
  public permitSubtypes = Picklists.permitSubtypePicklist;
  public agencies = Picklists.agencyPicklist;

  // Documents
  public documents = [];
  public links = [];
  public documentsToDelete = [];

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private recordUtils: RecordUtils,
    private factoryService: FactoryService,
    private loadingScreenService: LoadingScreenService,
    private utils: Utils,
    private _changeDetectionRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.data.pipe(takeUntil(this.ngUnsubscribe)).subscribe((res: any) => {
      this.isEditing = res.breadcrumb !== 'Add Permit';
      if (this.isEditing) {
        if (res && res.record && res.record[0] && res.record[0].data) {
          this.currentRecord = res.record[0].data;
          this.populateTextFields();
        } else {
          alert('Error: could not load edit permit.');
          this.router.navigate(['/']);
        }
      }
      this.buildForm();

      this.subscribeToFormControlChanges();

      this.loading = false;
      this._changeDetectionRef.detectChanges();
    });
  }

  private populateTextFields() {
    if (this.currentRecord.dateUpdated) {
      this.lastEditedSubText = `Last Edited on ${this.utils.convertJSDateToString(
        new Date(this.currentRecord.dateUpdated)
      )}`;
    } else {
      this.lastEditedSubText = `Added on ${this.utils.convertJSDateToString(new Date(this.currentRecord.dateAdded))}`;
    }
    for (const flavour of this.currentRecord.flavours) {
      switch (flavour._schemaName) {
        case 'PermitLNG':
          this.lngFlavour = flavour;
          this.lngFlavour.read.includes('public') &&
            (this.lngPublishSubtext = `Published on ${this.utils.convertJSDateToString(
              new Date(this.lngFlavour.datePublished)
            )}`);
          break;
        default:
          break;
      }
    }
  }

  private subscribeToFormControlChanges() {
    // listen to legislation control changes
    const debouncedUpdateLegislationDescription = this.utils.debounced(500, () => this.updateLegislationDescription());
    this.myForm
      .get('legislation')
      .valueChanges.pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        debouncedUpdateLegislationDescription();
      });
  }

  private updateLegislationDescription() {
    const legislation = new Legislation({
      act: this.myForm.get('legislation.act').value,
      regulation: this.myForm.get('legislation.regulation').value,
      section: this.myForm.get('legislation.section').value,
      subSection: this.myForm.get('legislation.subSection').value,
      paragraph: this.myForm.get('legislation.paragraph').value
    });

    this.myForm.get('legislationDescription').setValue(Picklists.getLegislationDescription('Permit', legislation));
    this.myForm.get('legislationDescription').markAsDirty();
  }

  private buildForm() {
    this.myForm = new FormGroup({
      // Master
      recordName: new FormControl((this.currentRecord && this.currentRecord.recordName) || ''),
      recordSubtype: new FormControl((this.currentRecord && this.currentRecord.recordSubtype) || ''),
      dateIssued: new FormControl(
        (this.currentRecord &&
          this.currentRecord.dateIssued &&
          this.utils.convertJSDateToNGBDate(new Date(this.currentRecord.dateIssued))) ||
          ''
      ),
      issuingAgency: new FormControl((this.currentRecord && this.currentRecord.issuingAgency) || ''),
      legislation: new FormGroup({
        act: new FormControl(
          (this.currentRecord && this.currentRecord.legislation && this.currentRecord.legislation.act) || ''
        ),
        regulation: new FormControl(
          (this.currentRecord && this.currentRecord.legislation && this.currentRecord.legislation.regulation) || ''
        ),
        section: new FormControl(
          (this.currentRecord && this.currentRecord.legislation && this.currentRecord.legislation.section) || ''
        ),
        subSection: new FormControl(
          (this.currentRecord && this.currentRecord.legislation && this.currentRecord.legislation.subSection) || ''
        ),
        paragraph: new FormControl(
          (this.currentRecord && this.currentRecord.legislation && this.currentRecord.legislation.paragraph) || ''
        )
      }),
      legislationDescription: new FormControl((this.currentRecord && this.currentRecord.legislationDescription) || ''),
      projectName: new FormControl((this.currentRecord && this.currentRecord.projectName) || ''),
      location: new FormControl((this.currentRecord && this.currentRecord.location) || ''),
      latitude: new FormControl(
        (this.currentRecord && this.currentRecord.centroid && this.currentRecord.centroid[1]) || ''
      ),
      longitude: new FormControl(
        (this.currentRecord && this.currentRecord.centroid && this.currentRecord.centroid[0]) || ''
      ),

      // LNG
      lngDescription: new FormControl((this.currentRecord && this.lngFlavour && this.lngFlavour.description) || ''),
      publishLng: new FormControl(
        (this.currentRecord && this.lngFlavour && this.lngFlavour.read.includes('public')) || false
      )
    });
  }

  navigateToDetails() {
    this.router.navigate(['records', 'permits', this.currentRecord._id, 'detail']);
  }

  togglePublish(event, flavour) {
    switch (flavour) {
      case 'lng':
        this.myForm.controls.publishLng.setValue(event.checked);
        break;
      default:
        break;
    }
    this._changeDetectionRef.detectChanges();
  }

  async submit() {
    this.loadingScreenService.setLoadingState(true, 'main');
    // TODO
    // _epicProjectId
    // _sourceRefId
    // _epicMilestoneId
    // legislation
    // projectName

    const permit = {};
    this.myForm.controls.recordName.dirty && (permit['recordName'] = this.myForm.controls.recordName.value);
    this.myForm.controls.recordSubtype.dirty && (permit['recordSubtype'] = this.myForm.controls.recordSubtype.value);
    this.myForm.controls.dateIssued.dirty &&
      (permit['dateIssued'] = this.utils.convertFormGroupNGBDateToJSDate(this.myForm.get('dateIssued').value));
    this.myForm.controls.issuingAgency.dirty && (permit['issuingAgency'] = this.myForm.controls.issuingAgency.value);

    if (
      this.myForm.get('legislation.act').dirty ||
      this.myForm.get('legislation.regulation').dirty ||
      this.myForm.get('legislation.section').dirty ||
      this.myForm.get('legislation.subSection').dirty ||
      this.myForm.get('legislation.paragraph').dirty
    ) {
      permit['legislation'] = {
        act: this.myForm.get('legislation.act').value,
        regulation: this.myForm.get('legislation.regulation').value,
        section: this.myForm.get('legislation.section').value,
        subSection: this.myForm.get('legislation.subSection').value,
        paragraph: this.myForm.get('legislation.paragraph').value
      };
    }
    this.myForm.controls.legislationDescription.dirty &&
      (permit['legislationDescription'] = this.myForm.controls.legislationDescription.value);

    // Project name logic
    // If LNG Canada or Coastal Gaslink are selected we need to put it their corresponding OIDs
    this.myForm.controls.projectName.dirty && (permit['projectName'] = this.myForm.controls.projectName.value);
    if (permit['projectName'] === 'LNG Canada') {
      permit['_epicProjectId'] = EpicProjectIds.lngCanadaId;
    } else if (permit['projectName'] === 'Coastal Gaslink') {
      permit['_epicProjectId'] = EpicProjectIds.coastalGaslinkId;
    }

    this.myForm.controls.location.dirty && (permit['location'] = this.myForm.controls.location.value);
    (this.myForm.controls.latitude.dirty || this.myForm.controls.longitude.dirty) &&
      (permit['centroid'] = [this.myForm.controls.longitude.value, this.myForm.controls.latitude.value]);

    // LNG flavour
    if (this.myForm.controls.lngDescription.dirty || this.myForm.controls.publishLng.dirty) {
      permit['PermitLNG'] = {};
    }
    this.myForm.controls.lngDescription.dirty &&
      (permit['PermitLNG']['description'] = this.myForm.controls.lngDescription.value);
    if (this.myForm.controls.publishLng.dirty && this.myForm.controls.publishLng.value) {
      permit['PermitLNG']['addRole'] = 'public';
    } else if (this.myForm.controls.publishLng.dirty && !this.myForm.controls.publishLng.value) {
      permit['PermitLNG']['removeRole'] = 'public';
    }

    if (!this.isEditing) {
      this.factoryService.createPermit(permit).subscribe(async res => {
        this.recordUtils.parseResForErrors(res);
        const docResponse = await this.recordUtils.handleDocumentChanges(
          this.links,
          this.documents,
          this.documentsToDelete,
          res[0][0].object._id,
          this.factoryService
        );

        console.log(docResponse);
        this.loadingScreenService.setLoadingState(false, 'main');
        this.router.navigate(['records']);
      });
    } else {
      permit['_id'] = this.currentRecord._id;

      if (this.lngFlavour) {
        if (!CommonUtils.isObject(permit['PermitLNG'])) {
          permit['PermitLNG'] = {};
        }

        // always update if flavour exists, regardless of flavour field changes, as fields in master might have changed
        permit['PermitLNG']['_id'] = this.lngFlavour._id;
      }

      this.factoryService.editPermit(permit).subscribe(async res => {
        this.recordUtils.parseResForErrors(res);
        const docResponse = await this.recordUtils.handleDocumentChanges(
          this.links,
          this.documents,
          this.documentsToDelete,
          this.currentRecord._id,
          this.factoryService
        );

        console.log(docResponse);
        this.loadingScreenService.setLoadingState(false, 'main');
        this.router.navigate(['records', 'permits', this.currentRecord._id, 'detail']);
      });
    }
  }

  cancel() {
    const shouldCancel = confirm(
      'Leaving this page will discard unsaved changes. Are you sure you would like to continue?'
    );
    if (shouldCancel) {
      if (!this.isEditing) {
        this.router.navigate(['records']);
      } else {
        this.router.navigate(['records', 'permits', this.currentRecord._id, 'detail']);
      }
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
